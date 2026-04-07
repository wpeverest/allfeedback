#!/usr/bin/env node
/**
 * rename.js — Boilerplate setup script
 *
 * Renames every boilerplate identifier to match your new plugin.
 * Run once after cloning:
 *
 *   node bin/rename.js
 *
 * What it replaces:
 *   - PHP namespace        AllFeedback → YourNamespace
 *   - Plugin slug          all-feedback → your-plugin
 *   - Option/hook prefix   allfb_ / allfb- / ALLFB     → your prefix
 *   - Display name         All Feedback → Your Plugin Name
 *   - Short menu name      AllFeedback         → Your Short Name
 *   - Author name/URL      Themegrill / themegrill.com
 *   - NPM package name     @allfeedback/core/all-feedback
 *   - Main plugin filename all-feedback.php
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const readline = require('readline');

// ── Root of the plugin ────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');

// ── Files / globs to process ─────────────────────────────────────────────────
const INCLUDE_EXTENSIONS = [
    '.php', '.ts', '.tsx', '.js', '.mjs', '.cjs',
    '.json', '.css', '.pcss', '.xml', '.txt', '.md', '.pot',
];

const EXCLUDE_DIRS = [
    'node_modules', 'vendor', '.git',
    // Skip this script itself's directory listing — we rewrite it last
];

// ── Prompt helper ─────────────────────────────────────────────────────────────
function prompt(rl, question) {
    return new Promise(resolve => rl.question(question, resolve));
}

// ── Derive identifiers from user input ───────────────────────────────────────
function deriveIdentifiers(input) {
    const {
        pluginName,       // e.g. "My Awesome Plugin"
        shortName,        // e.g. "MAP"  (used for menu title)
        vendorSlug,       // e.g. "my-vendor"
        pluginSlug,       // e.g. "my-awesome-plugin"
        phpNamespace,     // e.g. "MyAwesomePlugin"
        prefix,           // e.g. "map"  (lowercase, used for allfb_)
        authorName,       // e.g. "My Company"
        authorUrl,        // e.g. "https://mycompany.com"
        npmScope,         // e.g. "my-vendor"
    } = input;

    const UPPER_PREFIX  = prefix.toUpperCase();   // MAP
    const SNAKE_PREFIX  = prefix.toLowerCase();   // map

    return [
        // ── PHP Namespace ─────────────────────────────────────────────
        [ 'AllFeedback', phpNamespace ],

        // ── Plugin slug (text domain, menu slug, REST namespace, etc.) ─
        [ 'all-feedback/v1', `${pluginSlug}/v1` ],
        [ 'all-feedback',    pluginSlug ],
        [ 'all_feedback',    pluginSlug.replace(/-/g, '_') ],

        // ── Prefix — order matters: longer/more-specific first ─────────
        [ '__ALLFB_ADMIN__',  `__${UPPER_PREFIX}_ADMIN__` ],
        [ 'ALLFB-Admin-Root', `${UPPER_PREFIX}-Admin-Root` ],
        [ 'allfb-admin-root', `${SNAKE_PREFIX}-admin-root` ], // lowercase variant
        [ `allfb_`,           `${SNAKE_PREFIX}_` ],
        [ `allfb-`,           `${SNAKE_PREFIX}-` ],
        [ `'allfb'`,          `'${SNAKE_PREFIX}'` ],          // quoted in XML
        [ `"allfb"`,          `"${SNAKE_PREFIX}"` ],
        [ ` ALLFB `,          ` ${UPPER_PREFIX} ` ],          // spaced (comments)

        // ── Display names ─────────────────────────────────────────────
        [ 'All Feedback', pluginName ],
        [ 'All Feedback',  pluginName ],
        [ 'AllFeedback',         shortName  ],

        // ── Author ────────────────────────────────────────────────────
        [ 'https://themergill.com', authorUrl  ],
        [ 'Themegrill',             authorName ],

        // ── NPM package name ──────────────────────────────────────────
        [ '@allfeedback/core/all-feedback', `@${npmScope}/${pluginSlug}` ],

        // ── Webpack bar name ──────────────────────────────────────────
        [ "name: 'All Feedback'", `name: '${pluginName}'` ],
    ];
}

// ── Walk directory tree ───────────────────────────────────────────────────────
function* walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (EXCLUDE_DIRS.includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* walk(full);
        } else if (INCLUDE_EXTENSIONS.includes(path.extname(entry.name))) {
            yield full;
        }
    }
}

// ── Apply all replacements to a string ───────────────────────────────────────
function applyReplacements(content, pairs) {
    for (const [from, to] of pairs) {
        if (from === to) continue;
        // Escape regex special chars in the search string
        const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        content = content.replace(new RegExp(escaped, 'g'), to);
    }
    return content;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║       All Feedback — Setup Wizard         ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log('Answer the prompts below. Press Enter to accept defaults.\n');

    const pluginName   = (await prompt(rl, 'Plugin display name       [e.g. My Awesome Plugin]: ')).trim();
    const shortName    = (await prompt(rl, 'Short menu name           [e.g. My Plugin]:         ')).trim() || pluginName;
    const pluginSlug   = (await prompt(rl, 'Plugin slug (kebab-case)  [e.g. my-awesome-plugin]: ')).trim();
    const phpNamespace = (await prompt(rl, 'PHP namespace (PascalCase)[e.g. MyAwesomePlugin]:   ')).trim();
    const prefix       = (await prompt(rl, 'Short prefix (lowercase)  [e.g. map]:               ')).trim();
    const authorName   = (await prompt(rl, 'Author name               [e.g. My Company]:        ')).trim();
    const authorUrl    = (await prompt(rl, 'Author URL                [e.g. https://myco.com]:  ')).trim();
    const npmScope     = (await prompt(rl, 'NPM scope (no @)          [e.g. my-vendor]:         ')).trim() || 'my-vendor';

    rl.close();

    // Basic validation
    const missing = [];
    if (!pluginName)   missing.push('Plugin display name');
    if (!pluginSlug)   missing.push('Plugin slug');
    if (!phpNamespace) missing.push('PHP namespace');
    if (!prefix)       missing.push('Short prefix');
    if (!authorName)   missing.push('Author name');
    if (!authorUrl)    missing.push('Author URL');
    if (missing.length) {
        console.error('\n✗ Missing required fields:', missing.join(', '));
        process.exit(1);
    }

    const pairs = deriveIdentifiers({
        pluginName, shortName, vendorSlug: npmScope,
        pluginSlug, phpNamespace, prefix,
        authorName, authorUrl, npmScope,
    });

    console.log('\n⟳  Rewriting files...');

    let fileCount = 0;
    for (const file of walk(ROOT)) {
        const original = fs.readFileSync(file, 'utf8');
        const updated  = applyReplacements(original, pairs);
        if (updated !== original) {
            fs.writeFileSync(file, updated, 'utf8');
            console.log('  ✓', path.relative(ROOT, file));
            fileCount++;
        }
    }

    // ── Rename main plugin PHP file ───────────────────────────────────────
    const oldPhpFile = path.join(ROOT, 'all-feedback.php');
    const newPhpFile = path.join(ROOT, `${pluginSlug}.php`);
    if (fs.existsSync(oldPhpFile) && oldPhpFile !== newPhpFile) {
        fs.renameSync(oldPhpFile, newPhpFile);
        console.log(`  ✓ Renamed: all-feedback.php → ${pluginSlug}.php`);
    }

    // ── Rename languages .pot file ────────────────────────────────────────
    const oldPot = path.join(ROOT, 'languages', 'all-feedback.pot');
    const newPot = path.join(ROOT, 'languages', `${pluginSlug}.pot`);
    if (fs.existsSync(oldPot) && oldPot !== newPot) {
        fs.renameSync(oldPot, newPot);
        console.log(`  ✓ Renamed: languages/all-feedback.pot → languages/${pluginSlug}.pot`);
    }

    console.log(`\n✔  Done! ${fileCount} file(s) updated.\n`);
    console.log('Next steps:');
    console.log('  1. composer install');
    console.log('  2. pnpm install');
    console.log('  3. pnpm build');
    console.log('  4. Activate the plugin in WordPress\n');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
