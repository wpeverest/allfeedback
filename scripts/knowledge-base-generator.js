const {
	readFileSync,
	writeFileSync,
	existsSync,
	readdirSync,
	mkdirSync,
} = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const Anthropic = require('@anthropic-ai/sdk');


// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PLUGIN_NAME = process.env.PLUGIN_NAME || 'allfeedback';
const PLUGIN_PATH = '.';
const KB_REPO_DIR = 'themegrill-knowledge-base';
const KB_PLUGIN_DIR = path.join(KB_REPO_DIR, 'plugins', PLUGIN_NAME);
const KB_FILE = 'knowledge_base.json';
const FAILED_FILE = 'failed_or_errored_files.json';

// Token / chunk budget
const TARGET_TOTAL_TOKENS = parseInt(
	process.env.TARGET_TOTAL_TOKENS || '10000',
	10,
);
const CHARS_PER_TOKEN = 4;
const RESERVE_TOKENS_FOR_USER_WRAP = 200;

// Batch processing
const BATCH_NUMBER = parseInt(process.env.BATCH_NUMBER || '0');
const TOTAL_BATCHES = parseInt(process.env.TOTAL_BATCHES || '1');

// Rate limiting
const RATE_LIMIT_DELAY = 7000;
const MAX_RETRIES = 5;
const BASE_BACKOFF = 10000;

// ---------------------------------------------------------------------------
// Compact schema
// Stored inside the JSON so the reading Claude can decode abbreviated keys.
// ---------------------------------------------------------------------------
const SCHEMA = {
	_info:
		'Abbreviated keys to reduce token count. Each key maps abbr -> full name.',
	// top-level
	pn: 'plugin_name',
	ga: 'generated_at',
	ua: 'updated_at',
	bi: 'batch_info',
	pm: 'plugin_metadata',
	// batch_info
	bn: 'batch_number',
	tb: 'total_batches',
	// plugin_metadata
	rp: 'requires_php',
	tu: 'tested_up_to',
	st: 'stable_tag',
	wt: 'wp_tested_up_to',
	sd: 'short_description',
	// shared
	n: 'name',
	pu: 'purpose',
	ud: 'user_description',
	kc: 'key_classes',
	hu: 'hooks_used',
	se: 'settings',
	u: 'ui_flow',
	d: 'dependencies',
	pl: 'plan',
	dl: 'doc_link',
	pr: 'prerequisites',
	gk: 'gotchas',
	// settings fields
	k: 'key',
	l: 'label',
	t: 'type',
	v: 'default',
	ds: 'description',
	ui: 'user_impact',
	o: 'options',
	ap: 'applies_to',
	sc: 'scope',
	// menus
	mt: 'type',
	mp: 'parent',
	ps: 'page_slug',
	lt: 'title',
	cp: 'capability',
	tb2: 'tab',
	sx: 'section',
	// ui_elements
	sr: 'screen',
	el: 'elements',
	ht: 'help_text',
	// task_flows
	tk: 'task',
	ct: 'category',
	df: 'difficulty',
	sp: 'steps',
	oc: 'outcome',
	// workflows
	tr: 'trigger',
	vp: 'validation_points',
	dg: 'data_storage',
	rs: 'response',
	// shortcodes
	tg: 'tag',
	at: 'attributes',
	ex: 'example',
	// glossary
	gm: 'term',
	gd: 'definition',
	gc: 'context',
	// error_messages
	em: 'message',
	eg: 'trigger',
	er_res: 'resolution',
	// functions / classes (reuse n for name)
	fs: 'summary',
};

// ---------------------------------------------------------------------------
// Field maps: full key -> abbreviated key, per object type.
// compact() uses these; expand() inverts them.
// ---------------------------------------------------------------------------
const FM = {
	meta: {
		requires_php: 'rp',
		tested_up_to: 'tu',
		stable_tag: 'st',
		wp_tested_up_to: 'wt',
		short_description: 'sd',
	},
	menu: {
		type: 'mt',
		parent: 'mp',
		page_slug: 'ps',
		title: 'lt',
		capability: 'cp',
		tab: 'tb2',
		section: 'sx',
		ui_flow: 'u',
	},
	module: {
		name: 'n',
		user_description: 'ud',
		purpose: 'pu',
		key_classes: 'kc',
		hooks_used: 'hu',
		settings: 'se',
		ui_flow: 'u',
		prerequisites: 'pr',
		gotchas: 'gk',
		dependencies: 'd',
		plan: 'pl',
		doc_link: 'dl',
	},
	setting: {
		key: 'k',
		label: 'l',
		type: 't',
		default: 'v',
		description: 'ds',
		user_impact: 'ui',
		applies_to: 'ap',
		scope: 'sc',
		options: 'o',
		ui_flow: 'u',
		prerequisites: 'pr',
		gotchas: 'gk',
	},
	uiScreen: { screen: 'sr', ui_flow: 'u', elements: 'el' },
	uiEl: { label: 'l', type: 't', help_text: 'ht', default: 'v', options: 'o' },
	task: {
		task: 'tk',
		category: 'ct',
		difficulty: 'df',
		prerequisites: 'pr',
		steps: 'sp',
		outcome: 'oc',
		gotchas: 'gk',
		related_settings: 'se',
	},
	workflow: {
		name: 'n',
		trigger: 'tr',
		steps: 'sp',
		validation_points: 'vp',
		data_storage: 'dg',
		response: 'rs',
	},
	shortcode: {
		tag: 'tg',
		user_description: 'ud',
		attributes: 'at',
		example: 'ex',
	},
	scAttr: { name: 'n', description: 'ds', default: 'v', required: 'rq' },
	glossary: { term: 'gm', definition: 'gd', context: 'gc' },
	error: { message: 'em', trigger: 'eg', resolution: 'er_res' },
	fn: { name: 'n', summary: 'fs' },
};

// ---------------------------------------------------------------------------
// Compact / expand utilities
// ---------------------------------------------------------------------------
function compact(obj, fieldMap) {
	const out = {};
	for (const [full, abbr] of Object.entries(fieldMap)) {
		const v = obj[full];
		if (v === null || v === undefined) continue;
		if (Array.isArray(v) && v.length === 0) continue;
		if (typeof v === 'string' && v.trim() === '') continue;
		out[abbr] = v;
	}
	return out;
}

function invertFM(fm) {
	const inv = {};
	for (const [full, abbr] of Object.entries(fm)) inv[abbr] = full;
	return inv;
}

function expand(obj, fieldMap) {
	const inv = invertFM(fieldMap);
	const out = {};
	for (const [k, v] of Object.entries(obj)) out[inv[k] || k] = v;
	return out;
}

// Typed compact/expand helpers
const compactSetting = (s) => compact(s, FM.setting);
const compactMenu = (m) => compact(m, FM.menu);
const compactUiEl = (e) => compact(e, FM.uiEl);
const compactGlossary = (g) => compact(g, FM.glossary);
const compactError = (e) => compact(e, FM.error);
const compactWorkflow = (w) => compact(w, FM.workflow);
const compactTask = (t) => compact(t, FM.task);
const compactFn = (f) => compact(f, FM.fn);

function compactUiScreen(s) {
	const out = compact(s, FM.uiScreen);
	if (out.el) out.el = out.el.map(compactUiEl);
	return out;
}
function compactShortcode(s) {
	const out = compact(s, FM.shortcode);
	if (out.at) out.at = out.at.map((a) => compact(a, FM.scAttr));
	return out;
}
function compactModule(m) {
	const out = compact(m, FM.module);
	if (out.se) out.se = out.se.map(compactSetting);
	return out;
}

const expandSetting = (s) => expand(s, FM.setting);
const expandMenu = (m) => expand(m, FM.menu);
const expandGlossary = (g) => expand(g, FM.glossary);
const expandError = (e) => expand(e, FM.error);
const expandWorkflow = (w) => expand(w, FM.workflow);
const expandTask = (t) => expand(t, FM.task);

function expandUiScreen(s) {
	const out = expand(s, FM.uiScreen);
	if (out.elements) out.elements = out.elements.map((e) => expand(e, FM.uiEl));
	return out;
}
function expandShortcode(s) {
	const out = expand(s, FM.shortcode);
	if (out.attributes)
		out.attributes = out.attributes.map((a) => expand(a, FM.scAttr));
	return out;
}
function expandModule(m) {
	const out = expand(m, FM.module);
	if (out.settings) out.settings = out.settings.map(expandSetting);
	return out;
}

// ---------------------------------------------------------------------------
// Extensions JSON helpers (plan + doc_link enrichment)
// ---------------------------------------------------------------------------
function slugifyName(name) {
	if (!name || typeof name !== 'string') return '';
	return name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

function loadExtensionsMap(field) {
	const map = new Map();
	const base = path.join(PLUGIN_PATH, 'assets', 'extensions-json');
	const addEntry = (entry) => {
		if (!entry?.[field]) return;
		const val = entry[field];
		const set = (key) => {
			if (key) map.set(key, val);
		};
		set(entry.slug);
		set(entry.title);
		set(entry.name);
		if (entry.title) {
			set('user-registration-' + slugifyName(entry.title));
			set(entry.title.split(/\s+/)[0]);
		}
		if (entry.name) {
			set('user-registration-' + slugifyName(entry.name));
			set(entry.name.split(/\s+/)[0]);
		}
	};
	for (const [rel, key] of [
		['sections/all_extensions.json', 'products'],
		['all-features.json', 'features'],
	]) {
		const p = path.join(base, rel);
		if (existsSync(p)) {
			try {
				(JSON.parse(readFileSync(p, 'utf-8'))[key] || []).forEach(addEntry);
			} catch {}
		}
	}
	return map;
}

function enrichItems(items, planMap, docMap) {
	const lookup = (map, item) =>
		map.get(item.slug) ??
		map.get(item.name) ??
		map.get(item.title) ??
		map.get('user-registration-' + slugifyName(item.name || item.title || ''));
	(items || []).forEach((item) => {
		const plan = lookup(planMap, item);
		if (plan) item.plan = plan;
		const link = lookup(docMap, item);
		if (link) item.doc_link = link;
	});
}

// ---------------------------------------------------------------------------
// File system helpers
// ---------------------------------------------------------------------------
const git = simpleGit();

const EXCLUDED_DIRS = new Set([
	'node_modules',
	'vendor',
	'tests',
	'assets',
	'languages',
	'.github',
	'build',
	'chunks',
	'release',
	'themegrill-knowledge-base',
	'templates',
]);
const EXCLUDED_PATTERNS = [
	/[\/\\]views[\/\\]/,
	/[\/\\]libraries[\/\\]/,
	/[\/\\]country-and-state[\/\\]/,
	/[\/\\]assets[\/\\]/,
	/[\/\\]3rd-party[\/\\]/,
];
const isExcluded = (rel) => EXCLUDED_PATTERNS.some((p) => p.test(rel));

function getAllPhpFiles(dir, list = []) {
	try {
		readdirSync(dir, { withFileTypes: true }).forEach((file) => {
			const fp = path.join(dir, file.name);
			const rel = path.relative(PLUGIN_PATH, fp).replace(/\\/g, '/');
			if (file.isDirectory()) {
				if (
					!file.name.startsWith('.') &&
					!EXCLUDED_DIRS.has(file.name) &&
					!isExcluded(rel)
				)
					getAllPhpFiles(fp, list);
			} else if (
				file.isFile() &&
				file.name.endsWith('.php') &&
				file.name !== 'uninstall.php'
			) {
				if (!isExcluded(rel)) list.push(fp);
			}
		});
	} catch (e) {
		console.error(`❌ Error reading ${dir}:`, e.message);
	}
	return list;
}

async function getChangedPhpFiles() {
	let base = process.env.GIT_DIFF_BASE || 'HEAD~1';
	if (!base || /^0+$/.test(base)) base = 'HEAD~1';
	try {
		const out = await git.raw(['diff', '--name-only', base, 'HEAD']);
		return (out || '')
			.trim()
			.split(/\r?\n/)
			.filter(Boolean)
			.filter((p) => p.endsWith('.php'))
			.map((p) =>
				path
					.relative(PLUGIN_PATH, path.resolve(PLUGIN_PATH, p))
					.replace(/\\/g, '/'),
			)
			.filter((p) => !isExcluded(p) && !p.endsWith('uninstall.php'));
	} catch (e) {
		console.warn('⚠️  git diff failed:', e.message);
		return [];
	}
}

// ---------------------------------------------------------------------------
// readme / version metadata
// ---------------------------------------------------------------------------
function extractMetadataFromReadme() {
	const p = path.join(PLUGIN_PATH, 'readme.txt');
	const meta = { requires_php: null, tested_up_to: null, stable_tag: null };
	if (!existsSync(p)) return meta;
	try {
		readFileSync(p, 'utf-8')
			.split('\n')
			.forEach((line) => {
				if (line.startsWith('Requires PHP at least:'))
					meta.requires_php = line.split(':').slice(1).join(':').trim();
				else if (line.startsWith('Tested up to:'))
					meta.tested_up_to = line.split(':').slice(1).join(':').trim();
				else if (line.startsWith('Stable tag:'))
					meta.stable_tag = line.split(':').slice(1).join(':').trim();
			});
	} catch (e) {
		console.error('❌ readme.txt:', e.message);
	}
	return meta;
}

function extractPluginVersion() {
	const p = path.join(PLUGIN_PATH, `${PLUGIN_NAME}.php`);
	if (!existsSync(p)) return null;
	try {
		for (const line of readFileSync(p, 'utf-8').split('\n')) {
			const m = line.match(/^\s*\*\s*Version:\s*([\d.]+)/);
			if (m) return m[1].trim();
		}
	} catch (e) {
		console.error('❌ main plugin file:', e.message);
	}
	return null;
}

// ---------------------------------------------------------------------------
// Claude API
// ---------------------------------------------------------------------------
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
if (!CLAUDE_API_KEY) {
	console.error('❌ CLAUDE_API_KEY is not set.');
	process.exit(1);
}
const client = new Anthropic({ apiKey: CLAUDE_API_KEY });

async function callClaudeWithRetry(
	prompt,
	systemPrompt = '',
	maxRetries = MAX_RETRIES,
) {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const cfg = {
				model: 'claude-sonnet-4-20250514',
				max_tokens: 4096,
				messages: [{ role: 'user', content: prompt }],
			};
			if (systemPrompt)
				cfg.system = [
					{
						type: 'text',
						text: systemPrompt,
						cache_control: { type: 'ephemeral' },
					},
				];

			const msg = await client.messages.create(cfg);
			return msg.content
				.filter((b) => b.type === 'text')
				.map((b) => b.text)
				.join('');
		} catch (error) {
			const isRate =
				error.status === 429 || error.message?.includes('rate_limit');
			if (isRate && attempt < maxRetries - 1) {
				const wait = BASE_BACKOFF * Math.pow(2, attempt);
				console.log(
					`⏳ Rate limit — waiting ${wait / 1000}s (retry ${attempt + 1}/${maxRetries})`,
				);
				await new Promise((r) => setTimeout(r, wait));
			} else if (attempt === maxRetries - 1) {
				console.error('❌ Max retries exceeded');
				throw error;
			} else {
				console.error('❌ Claude API error:', error.message);
				throw error;
			}
		}
	}
	throw new Error('Max retries exceeded');
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
function getClaudeInstructions() {
	for (const name of ['CLAUDE.md', 'Claude.md', 'claude.md']) {
		const p = path.join(PLUGIN_PATH, name);
		if (existsSync(p)) {
			try {
				return readFileSync(p, 'utf-8');
			} catch {}
		}
	}
	return '';
}

function buildSystemPrompt() {
	const extra = getClaudeInstructions();
	return `You are a technical writer analyzing a WordPress plugin codebase to build a knowledge base for writing beginner-friendly documentation. Your reader is a non-technical WordPress site owner — not a developer. They know how to log into wp-admin and click buttons, but do not understand code.
${extra ? `\n## Instructions from Claude.md:\n${extra}\n` : ''}
CONTEXT:
- AllFeedback WordPress plugin for collecting NPS and feedback surveys. All data stored locally — no third-party services.
- Modules in src/Modules/. No separate addons directory — modules extend core functionality.
- Settings: SURVEY-SPECIFIC (per survey, stored in wp_af_surveys.settings JSON column) or GLOBAL (site-wide, stored as _allfeedback_settings in wp_options, 3-level: page→section→field)
- Database: wp_af_surveys (form_schema, settings, styling, targeting JSON columns), wp_af_responses (response_data JSON), wp_af_survey_sessions (session tracking)
- REST API base: /wp-json/allfeedback/v1/ — write endpoints require manage_options; submission requires nonce allfeedback_submit
- Extract only what is EXPLICITLY in the code. Accuracy over completeness.

PRIMARY GOAL — extract info that helps write documentation a beginner can follow. Prioritise:
1. What the user sees on screen (labels, buttons, tooltips)
2. What each setting actually changes for the visitor or site owner
3. Step-by-step tasks a user would want to accomplish
4. Plain-English feature explanations — no code jargon
5. Warnings, prerequisites, common mistakes

Return ONLY valid JSON (no markdown fences):
{
  "functions":      [{"name":"...", "summary":"one-line dev description"}],
  "classes":        [{"name":"...", "summary":"one-line dev description"}],
  "hooks":          ["hook_name"],
  "filters":        ["filter_name"],
  "api_endpoints":  ["route"],
  "post_types":     ["post_type"],
  "constants":      ["CONSTANT"],
  "shortcodes": [{
    "tag": "shortcode-tag",
    "user_description": "Plain English: what this does when placed on a page",
    "attributes": [{"name":"attr","description":"what it controls","default":"val","required":true}],
    "example": "[shortcode-tag attr=\\"val\\"] — what this does"
  }],
  "menus": [{
    "type": "menu_page|submenu_page|settings_tab",
    "parent": "slug or null", "page_slug": "slug", "title": "Title",
    "capability": "manage_options", "tab": "slug or null", "section": "slug or null",
    "ui_flow": "wp-admin → Parent → Title → Tab → Section"
  }],
  "ui_elements": [{
    "screen": "e.g. Form Settings → General Tab",
    "ui_flow": "wp-admin → ... full path",
    "elements": [{
      "label": "Exact label text", "type": "text|select|checkbox|toggle|radio|button|textarea|number",
      "help_text": "Tooltip shown in UI (null if none)", "default": "default value",
      "options": ["Option A","Option B"]
    }]
  }],
  "modules": [{
    "name": "Module Name",
    "user_description": "Plain English: what this lets the site owner do and how it benefits visitors",
    "purpose": "Technical one-liner",
    "key_classes": ["ClassName"], "hooks_used": ["hook"],
    "settings": [{
      "key": "option_key", "label": "UI Label", "type": "text|select|checkbox|radio|textarea|number",
      "scope": "form|global", "description": "Technical description",
      "user_impact": "Plain English: what changes when this is enabled/changed",
      "options": [{"value":"val","label":"Label"}]
    }],
    "ui_flow": "wp-admin → ... how to access",
    "prerequisites": ["anything needed before this works"],
    "gotchas": ["common beginner mistakes"],
    "dependencies": []
  }],
  "addons": [/* same shape as modules */],
  "form_settings": [{
    "key": "settings.{section}.{field}", "label": "UI Label",
    "type": "text|select|checkbox|radio|textarea|number", "default": "value",
    "description": "Technical", "user_impact": "Plain English: what changes for survey respondents",
    "applies_to": "survey", "scope": "per_survey",
    "options": [{"value":"val","label":"Label"}],
    "ui_flow": "wp-admin → AllFeedback → Surveys → Edit Survey → Settings",
    "prerequisites": [], "gotchas": []
  }],
  "global_settings": [{
    "key": "_allfeedback_settings.{page}.{section}.{field}", "label": "UI Label",
    "type": "text|select|checkbox|radio|textarea|number", "default": "value",
    "description": "Technical", "user_impact": "Plain English: what changes site-wide",
    "applies_to": "global", "scope": "site_wide",
    "options": [{"value":"val","label":"Label"}],
    "ui_flow": "wp-admin → AllFeedback → Settings → {page} → {section}",
    "prerequisites": [], "gotchas": []
  }],
  "task_flows": [{
    "task": "Goal-oriented title e.g. 'Set up email confirmation'",
    "category": "setup|surveys|settings|analytics|responses|targeting|notifications|troubleshooting",
    "difficulty": "beginner|intermediate",
    "prerequisites": ["must do X first"],
    "steps": [
      "Go to wp-admin → User Registration → Settings",
      "Click the [General] tab",
      "Find [Login Option] and select [Email Confirmation]",
      "Click [Save Changes]"
    ],
    "outcome": "Plain English: what is different after completing this task",
    "gotchas": ["common mistakes"],
    "related_settings": ["option_key"]
  }],
  "workflows": [{
    "name": "Workflow Name", "trigger": "What initiates this",
    "steps": ["Step 1"], "validation_points": ["Validation 1"],
    "data_storage": ["wp_table"], "response": "What happens after completion"
  }],
  "glossary_terms": [{
    "term": "Term as shown in UI", "definition": "Plain English definition",
    "context": "Where this term appears e.g. Form Settings → General"
  }],
  "error_messages": [{
    "message": "Exact error text shown to user",
    "trigger": "What causes this", "resolution": "Plain English steps to fix it"
  }]
}

CRITICAL:
- user_description, user_impact, task_flows, glossary_terms = HIGHEST PRIORITY
- ui_elements: extract from add_settings_field(), wp_localize_script() data, label strings
- gotchas: capability checks, plan gates, conditional dependencies → plain English warnings
- error_messages: WP_Error, wc_add_notice(), admin_notices, validation strings — exact text
- select/radio/multiselect: always extract full options array with value AND label
- Only extract what is EXPLICITLY in the code. null or [] if unclear.`;
}

function getSystemPromptTokenEstimate() {
	return Math.ceil(buildSystemPrompt().length / CHARS_PER_TOKEN);
}
function getMaxChunkChars() {
	return (
		Math.max(
			0,
			TARGET_TOTAL_TOKENS -
				getSystemPromptTokenEstimate() -
				RESERVE_TOKENS_FOR_USER_WRAP,
		) * CHARS_PER_TOKEN
	);
}

// ---------------------------------------------------------------------------
// File chunking + JSON extraction
// ---------------------------------------------------------------------------
function splitFileIntoChunks(filePath) {
	if (!existsSync(filePath)) {
		console.error(`❌ Not found: ${filePath}`);
		return [];
	}
	try {
		const max = getMaxChunkChars();
		const chunks = [];
		let cur = '';
		for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
			const ln = line + '\n';
			if (cur.length + ln.length > max && cur.length > 0) {
				chunks.push(cur);
				cur = ln;
			} else cur += ln;
		}
		if (cur.trim()) chunks.push(cur);
		return chunks;
	} catch (e) {
		console.error(`❌ Error reading ${filePath}:`, e.message);
		return [];
	}
}

function extractJSON(response) {
	const cleaned = response.trim();
	const m = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
	return m ? m[1].trim() : cleaned;
}

// ---------------------------------------------------------------------------
// Short description generator (batch 0, first run only)
// ---------------------------------------------------------------------------
async function generateShortDescription(phpFiles) {
	const keyFiles = phpFiles
		.filter((f) => {
			const n = path.basename(f);
			return (
				n.includes('admin') ||
				n.includes('import') ||
				n === `${PLUGIN_NAME}.php` ||
				n.includes('ajax')
			);
		})
		.slice(0, 3);
	if (!keyFiles.length) return 'WordPress plugin addon';
	let combined = '';
	for (const f of keyFiles) {
		try {
			combined += `\n\n--- ${path.basename(f)} ---\n${readFileSync(f, 'utf-8').split('\n').slice(0, 200).join('\n')}`;
		} catch {}
	}
	try {
		const d = await callClaudeWithRetry(
			`Analyze these PHP snippets and return ONLY a single sentence (max 150 chars) describing what the plugin does:\n${combined}`,
		);
		return d.trim().replace(/^["']|["']$/g, '');
	} catch {
		return 'WordPress plugin addon';
	}
}

// ---------------------------------------------------------------------------
// Empty KB (working format — Maps/Sets for dedup during processing)
// ---------------------------------------------------------------------------
function emptyKB() {
	return {
		plugin_name: PLUGIN_NAME,
		generated_at: new Date().toISOString(),
		plugin_metadata: null,
		// beginner-doc focused
		task_flows: [],
		ui_elements: [],
		glossary_terms: [],
		error_messages: [],
		// features & navigation
		features: [],
		menus: [],
		modules: [],
		addons: [],
		form_settings: [],
		global_settings: [],
		workflows: [],
		// technical (Maps/Sets for O(1) dedup)
		shortcodes: new Map(), // tag -> object
		hooks: new Set(),
		filters: new Set(),
		api_endpoints: new Set(),
		post_types: new Set(),
		constants: new Set(),
		functions: new Map(), // name -> summary
		classes: new Map(), // name -> summary
	};
}

// ---------------------------------------------------------------------------
// Load existing compact KB back into working format
// ---------------------------------------------------------------------------
function loadExistingKnowledgeBase() {
	const kb = emptyKB();
	const kbPath = path.join(KB_PLUGIN_DIR, KB_FILE);
	if (!existsSync(kbPath)) return kb;

	try {
		const raw = JSON.parse(readFileSync(kbPath, 'utf-8'));
		const compact = !!raw._schema; // was it saved in compact format?

		kb.plugin_name = raw.pn || raw.plugin_name || PLUGIN_NAME;
		kb.generated_at = raw.ga || raw.generated_at || kb.generated_at;
		kb.plugin_metadata = raw.pm
			? expand(raw.pm, FM.meta)
			: raw.plugin_metadata || null;

		const load = (fullKey, abbr, expandFn) => {
			const arr = raw[compact ? abbr : fullKey] || [];
			return expandFn ? arr.map(expandFn) : arr;
		};

		kb.task_flows = load('task_flows', 'tf', expandTask);
		kb.ui_elements = load('ui_elements', 'ue', expandUiScreen);
		kb.glossary_terms = load('glossary_terms', 'gl', expandGlossary);
		kb.error_messages = load('error_messages', 'er', expandError);
		kb.features = raw.ft || raw.features || [];
		kb.menus = load('menus', 'mn', expandMenu);
		kb.modules = load('modules', 'md', expandModule);
		kb.addons = load('addons', 'ad', expandModule);
		kb.form_settings = load('form_settings', 'fs', expandSetting);
		kb.global_settings = load('global_settings', 'gs', expandSetting);
		kb.workflows = load('workflows', 'wf', expandWorkflow);

		// Sets
		(raw.hk || raw.hooks || []).forEach((h) => kb.hooks.add(h));
		(raw.fl || raw.filters || []).forEach((f) => kb.filters.add(f));
		(raw.ae || raw.api_endpoints || []).forEach((e) => kb.api_endpoints.add(e));
		(raw.pt || raw.post_types || []).forEach((p) => kb.post_types.add(p));
		(raw.cn || raw.constants || []).forEach((c) => kb.constants.add(c));

		// Maps
		(raw.fn || raw.functions || []).forEach((f) => {
			if (typeof f === 'object')
				kb.functions.set(f.n || f.fn || f.name || '', f.fs || f.summary || '');
			else kb.functions.set(f, '');
		});
		(raw.cl || raw.classes || []).forEach((c) => {
			if (typeof c === 'object')
				kb.classes.set(c.n || c.fn || c.name || '', c.fs || c.summary || '');
			else kb.classes.set(c, '');
		});
		(raw.sc || raw.shortcodes || []).forEach((s) => {
			if (typeof s === 'object') {
				const sc = compact ? expandShortcode(s) : s;
				kb.shortcodes.set(sc.tag, sc);
			} else {
				kb.shortcodes.set(s, { tag: s });
			}
		});

		console.log('✅ Loaded existing knowledge base');
	} catch (e) {
		console.warn('⚠️  Could not load KB, starting fresh:', e.message);
	}
	return kb;
}

// ---------------------------------------------------------------------------
// Merge one parsed chunk into the working KB
// ---------------------------------------------------------------------------
function mergeChunkData(kb, parsed) {
	// Functions / classes
	(parsed.functions || []).forEach((f) => {
		if (typeof f === 'object' && f.name)
			kb.functions.set(f.name, f.summary || '');
		else if (typeof f === 'string') kb.functions.set(f, '');
	});
	(parsed.classes || []).forEach((c) => {
		if (typeof c === 'object' && c.name)
			kb.classes.set(c.name, c.summary || '');
		else if (typeof c === 'string') kb.classes.set(c, '');
	});

	// Flat sets
	(parsed.hooks || []).forEach((h) => kb.hooks.add(h));
	(parsed.filters || []).forEach((f) => kb.filters.add(f));
	(parsed.api_endpoints || []).forEach((e) => kb.api_endpoints.add(e));
	(parsed.post_types || []).forEach((p) => kb.post_types.add(p));
	(parsed.constants || []).forEach((c) => kb.constants.add(c));

	// Shortcodes — keyed by tag
	(parsed.shortcodes || []).forEach((sc) => {
		if (typeof sc === 'object' && sc.tag) {
			if (!kb.shortcodes.has(sc.tag)) kb.shortcodes.set(sc.tag, sc);
		} else if (typeof sc === 'string') {
			if (!kb.shortcodes.has(sc)) kb.shortcodes.set(sc, { tag: sc });
		}
	});

	// Features
	(parsed.features || []).forEach((f) => {
		if (f && !kb.features.includes(f)) kb.features.push(f);
	});

	// Menus — dedup by page_slug or tab+section combo
	(parsed.menus || []).forEach((menu) => {
		const ex = kb.menus.find(
			(m) =>
				m.page_slug === menu.page_slug ||
				(menu.tab && m.tab === menu.tab && m.section === menu.section),
		);
		if (!ex) kb.menus.push(menu);
		else if (menu.ui_flow && !ex.ui_flow) ex.ui_flow = menu.ui_flow;
	});

	// UI elements — dedup by screen, merge elements by label
	(parsed.ui_elements || []).forEach((scr) => {
		if (!scr?.screen) return;
		const ex = kb.ui_elements.find((s) => s.screen === scr.screen);
		if (!ex) {
			kb.ui_elements.push(scr);
			return;
		}
		const seen = new Set((ex.elements || []).map((e) => e.label));
		(scr.elements || []).forEach((el) => {
			if (el.label && !seen.has(el.label)) {
				(ex.elements = ex.elements || []).push(el);
				seen.add(el.label);
			}
		});
	});

	// Modules — merge by name
	(parsed.modules || []).forEach((mod) => {
		const ex = kb.modules.find((m) => m.name === mod.name);
		if (!ex) {
			kb.modules.push(mod);
			return;
		}
		if (mod.key_classes)
			ex.key_classes = [
				...new Set([...(ex.key_classes || []), ...mod.key_classes]),
			];
		if (mod.hooks_used)
			ex.hooks_used = [
				...new Set([...(ex.hooks_used || []), ...mod.hooks_used]),
			];
		if (mod.settings) ex.settings = [...(ex.settings || []), ...mod.settings];
		if (mod.prerequisites)
			ex.prerequisites = [
				...new Set([...(ex.prerequisites || []), ...mod.prerequisites]),
			];
		if (mod.gotchas)
			ex.gotchas = [...new Set([...(ex.gotchas || []), ...mod.gotchas])];
		if (mod.ui_flow && !ex.ui_flow) ex.ui_flow = mod.ui_flow;
		if (mod.user_description && !ex.user_description)
			ex.user_description = mod.user_description;
	});

	// Addons — same shape as modules
	(parsed.addons || []).forEach((addon) => {
		const ex = kb.addons.find((a) => a.name === addon.name);
		if (!ex) {
			kb.addons.push(addon);
			return;
		}
		if (addon.key_classes)
			ex.key_classes = [
				...new Set([...(ex.key_classes || []), ...addon.key_classes]),
			];
		if (addon.hooks_used)
			ex.hooks_used = [
				...new Set([...(ex.hooks_used || []), ...addon.hooks_used]),
			];
		if (addon.settings)
			ex.settings = [...(ex.settings || []), ...addon.settings];
		if (addon.prerequisites)
			ex.prerequisites = [
				...new Set([...(ex.prerequisites || []), ...addon.prerequisites]),
			];
		if (addon.gotchas)
			ex.gotchas = [...new Set([...(ex.gotchas || []), ...addon.gotchas])];
		if (addon.ui_flow && !ex.ui_flow) ex.ui_flow = addon.ui_flow;
		if (addon.user_description && !ex.user_description)
			ex.user_description = addon.user_description;
	});

	// Settings — enrich existing with beginner fields if missing
	const mergeSetting = (arr, s) => {
		const ex = arr.find((x) => x.key === s.key);
		if (!ex) {
			arr.push(s);
			return;
		}
		if (s.user_impact && !ex.user_impact) ex.user_impact = s.user_impact;
		if (s.prerequisites && !ex.prerequisites)
			ex.prerequisites = s.prerequisites;
		if (s.gotchas && !ex.gotchas) ex.gotchas = s.gotchas;
	};
	(parsed.form_settings || []).forEach((s) =>
		mergeSetting(kb.form_settings, s),
	);
	(parsed.global_settings || []).forEach((s) =>
		mergeSetting(kb.global_settings, s),
	);

	// Task flows — dedup by task name
	(parsed.task_flows || []).forEach((t) => {
		if (t?.task && !kb.task_flows.find((x) => x.task === t.task))
			kb.task_flows.push(t);
	});

	// Workflows — dedup by name
	(parsed.workflows || []).forEach((w) => {
		if (w?.name && !kb.workflows.find((x) => x.name === w.name))
			kb.workflows.push(w);
	});

	// Glossary — case-insensitive dedup
	(parsed.glossary_terms || []).forEach((g) => {
		if (
			g?.term &&
			!kb.glossary_terms.find(
				(x) => x.term.toLowerCase() === g.term.toLowerCase(),
			)
		)
			kb.glossary_terms.push(g);
	});

	// Error messages — dedup by message text
	(parsed.error_messages || []).forEach((e) => {
		if (e?.message && !kb.error_messages.find((x) => x.message === e.message))
			kb.error_messages.push(e);
	});
}

// ---------------------------------------------------------------------------
// Process one chunk via Claude
// ---------------------------------------------------------------------------
async function processChunk(chunk, context = '', filePath = '') {
	const prompt = `${context ? `Previous context summary: ${context}\n\n` : ''}PHP Code from: ${filePath || 'unknown'}
\`\`\`php
${chunk}
\`\`\``;
	return callClaudeWithRetry(prompt, buildSystemPrompt());
}

// ---------------------------------------------------------------------------
// Save — single compact knowledge_base.json (minified, no pretty-print)
// ---------------------------------------------------------------------------
async function saveKnowledgeBase(kb) {
	const lockFile = path.join(KB_PLUGIN_DIR, '.kb-lock');
	let waited = 0;
	while (existsSync(lockFile) && waited < 60000) {
		console.log(`⏳ Waiting for lock... (${waited / 1000}s)`);
		await new Promise((r) => setTimeout(r, 1000));
		waited += 1000;
	}
	if (existsSync(lockFile)) console.error('❌ Lock timeout, forcing save');

	try {
		if (!existsSync(KB_PLUGIN_DIR))
			mkdirSync(KB_PLUGIN_DIR, { recursive: true });
		writeFileSync(lockFile, new Date().toISOString());

		// Fallback ui_flows
		kb.menus.forEach((m) => {
			if (!m.ui_flow) {
				let f = 'wp-admin';
				if (m.parent) f += ` → ${m.parent}`;
				if (m.title) f += ` → ${m.title}`;
				if (m.tab) f += ` → ${m.tab}`;
				if (m.section) f += ` → ${m.section}`;
				m.ui_flow = f;
			}
		});
		kb.form_settings.forEach((s) => {
			if (!s.ui_flow)
				s.ui_flow = `wp-admin → AllFeedback → Surveys → Survey Settings${s.label ? ` (${s.label})` : ''}`;
		});
		kb.global_settings.forEach((s) => {
			if (!s.ui_flow)
				s.ui_flow = `wp-admin → AllFeedback → Settings${s.tab ? ` → ${s.tab}` : ''}${s.label ? ` (${s.label})` : ''}`;
		});

		// Enrich modules + addons with plan / doc_link
		const planMap = loadExtensionsMap('plan');
		const docMap = loadExtensionsMap('link');
		enrichItems(kb.modules, planMap, docMap);
		enrichItems(kb.addons, planMap, docMap);

		// Build compact output — omit empty arrays/nulls at save time
		const out = {
			_schema: SCHEMA,
			pn: kb.plugin_name,
			ga: kb.generated_at,
			ua: new Date().toISOString(),
			bi: { bn: BATCH_NUMBER, tb: TOTAL_BATCHES },
			pm: kb.plugin_metadata ? compact(kb.plugin_metadata, FM.meta) : undefined,
			// beginner-doc focused
			tf: kb.task_flows.map(compactTask),
			ue: kb.ui_elements.map(compactUiScreen),
			gl: kb.glossary_terms.map(compactGlossary),
			er: kb.error_messages.map(compactError),
			// features & navigation
			ft: kb.features,
			mn: kb.menus.map(compactMenu),
			md: kb.modules.map(compactModule),
			ad: kb.addons.map(compactModule),
			fs: kb.form_settings.map(compactSetting),
			gs: kb.global_settings.map(compactSetting),
			wf: kb.workflows.map(compactWorkflow),
			// technical reference
			sc: Array.from(kb.shortcodes.values()).map(compactShortcode),
			hk: Array.from(kb.hooks),
			fl: Array.from(kb.filters),
			ae: Array.from(kb.api_endpoints),
			pt: Array.from(kb.post_types),
			cn: Array.from(kb.constants),
			fn: Array.from(kb.functions.entries()).map(([n, s]) =>
				compactFn({ name: n, summary: s }),
			),
			cl: Array.from(kb.classes.entries()).map(([n, s]) =>
				compactFn({ name: n, summary: s }),
			),
		};

		// Drop top-level keys that are empty / null / undefined
		for (const k of Object.keys(out)) {
			const v = out[k];
			if (v === null || v === undefined) {
				delete out[k];
				continue;
			}
			if (Array.isArray(v) && v.length === 0) delete out[k];
		}

		const kbPath = path.join(KB_PLUGIN_DIR, KB_FILE);
		const json = JSON.stringify(out); // minified — no whitespace
		writeFileSync(kbPath, json);
		console.log(
			`\n✅ Knowledge base saved: ${kbPath} (${(Buffer.byteLength(json) / 1024).toFixed(1)} KB)`,
		);
	} finally {
		if (existsSync(lockFile)) {
			try {
				require('fs').unlinkSync(lockFile);
			} catch (e) {
				console.error('⚠️  Could not remove lock:', e.message);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Failed files tracker
// ---------------------------------------------------------------------------
function loadFailedOrErroredFiles() {
	const p = path.join(KB_PLUGIN_DIR, FAILED_FILE);
	if (!existsSync(p)) return [];
	try {
		const d = JSON.parse(readFileSync(p, 'utf-8'));
		return (Array.isArray(d.files) ? d.files : [])
			.filter((f) => typeof f === 'string' && f.trim())
			.map((f) => f.replace(/\\/g, '/'));
	} catch {
		return [];
	}
}

function saveFailedOrErroredFiles(files) {
	const p = path.join(KB_PLUGIN_DIR, FAILED_FILE);
	try {
		if (!existsSync(KB_PLUGIN_DIR))
			mkdirSync(KB_PLUGIN_DIR, { recursive: true });
		writeFileSync(
			p,
			JSON.stringify(
				{
					files: files.map((f) => String(f).replace(/\\/g, '/')),
					updated_at: new Date().toISOString(),
				},
				null,
				2,
			),
		);
		if (files.length)
			console.log(`📋 Saved ${files.length} failed file(s) for retry`);
	} catch (e) {
		console.error('⚠️  Could not save failed files:', e.message);
	}
}

// ---------------------------------------------------------------------------
// Batch processor
// ---------------------------------------------------------------------------
async function processBatch(phpFiles, kb, failedRef) {
	const perBatch = Math.ceil(phpFiles.length / TOTAL_BATCHES);
	const start = BATCH_NUMBER * perBatch;
	const end = Math.min((BATCH_NUMBER + 1) * perBatch, phpFiles.length);
	const batch = phpFiles.slice(start, end);
	const failedSet = failedRef?.failed instanceof Set ? failedRef.failed : null;

	console.log(
		`\n📦 Batch ${BATCH_NUMBER + 1}/${TOTAL_BATCHES}: files ${start + 1}–${end} of ${phpFiles.length}`,
	);
	console.log(`📁 Files in batch: ${batch.length}`);
	console.log(
		`📐 Chunk budget: ~${Math.round(getMaxChunkChars() / CHARS_PER_TOKEN)} tokens`,
	);

	for (let i = 0; i < batch.length; i++) {
		const file = batch[i];
		let hadError = false;
		console.log(`\n📄 [${i + 1}/${batch.length}] ${file}`);

		const chunks = splitFileIntoChunks(file);
		if (!chunks.length) {
			console.log('  ⚠️  Skipped (empty or unreadable)');
			continue;
		}

		let context = '';
		for (let ci = 0; ci < chunks.length; ci++) {
			console.log(`  📝 Chunk ${ci + 1}/${chunks.length}`);
			try {
				const response = await processChunk(chunks[ci], context, file);
				try {
					const parsed = JSON.parse(extractJSON(response));
					mergeChunkData(kb, parsed);
					context = parsed.summary || '';
				} catch (pe) {
					console.error('  ❌ Parse error:', pe.message);
					hadError = true;
					failedSet?.add(file);
					continue;
				}
				console.log(`  ⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s...`);
				await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY));
			} catch (e) {
				console.error(`  ❌ Chunk ${ci + 1} error:`, e.message);
				hadError = true;
				failedSet?.add(file);
			}
		}
		if (!hadError) failedSet?.delete(file);
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
	try {
		console.log('🚀 Starting Knowledge Base Generator...');
		console.log(
			`📦 Plugin: ${PLUGIN_NAME}  |  Batch: ${BATCH_NUMBER + 1}/${TOTAL_BATCHES}`,
		);

		if (!existsSync(KB_REPO_DIR)) {
			console.error(`❌ KB repo not found: ${KB_REPO_DIR}`);
			process.exit(1);
		}

		const kb = loadExistingKnowledgeBase();

		// Metadata — batch 0 only, first run only
		if (BATCH_NUMBER === 0 && !kb.plugin_metadata) {
			console.log('\n📋 Extracting plugin metadata...');
			const readme = extractMetadataFromReadme();
			const version = extractPluginVersion();
			const desc = await generateShortDescription(
				getAllPhpFiles(PLUGIN_PATH).slice(0, 5),
			);
			kb.plugin_metadata = {
				requires_php: readme.requires_php || null,
				tested_up_to: readme.tested_up_to || null,
				stable_tag: readme.stable_tag || null,
				wp_tested_up_to: version || null,
				short_description: desc,
			};
		}

		const prevFailed = loadFailedOrErroredFiles();
		const kbPath = path.join(KB_PLUGIN_DIR, KB_FILE);
		const kbExists = existsSync(kbPath);

		let phpFiles;
		if (kbExists) {
			const changed = await getChangedPhpFiles();
			const pathSet = new Set(changed.map((f) => f.replace(/\\/g, '/')));
			prevFailed.forEach((f) => pathSet.add(f.replace(/\\/g, '/')));
			phpFiles = Array.from(pathSet);
			if (!phpFiles.length) {
				console.log('\n📋 KB exists — no changed or failed files. Skipping.');
			} else {
				console.log(
					`\n📋 KB exists → ${phpFiles.length} file(s): ${changed.length} changed + ${prevFailed.length} retries`,
				);
			}
		} else {
			phpFiles = getAllPhpFiles(PLUGIN_PATH).map((f) => f.replace(/\\/g, '/'));
			if (prevFailed.length) {
				const s = new Set(phpFiles);
				prevFailed.forEach((f) => s.add(f.replace(/\\/g, '/')));
				phpFiles = Array.from(s);
			}
			console.log(`\n📁 Full generation: ${phpFiles.length} PHP files`);
		}

		const failedRef = { failed: new Set(prevFailed) };
		await processBatch(phpFiles, kb, failedRef);
		await saveKnowledgeBase(kb);
		saveFailedOrErroredFiles(Array.from(failedRef.failed));

		console.log(`\n✅ Batch ${BATCH_NUMBER + 1}/${TOTAL_BATCHES} completed`);
	} catch (e) {
		console.error('\n❌ Fatal error:', e);
		process.exit(1);
	}
}

main().catch(console.error);
