import '../../styles/frontend.pcss';

// ---------------------------------------------------------------------------
// Config types (matches FrontendServiceProvider localized data)
// ---------------------------------------------------------------------------

interface AllfbSettings {
	color:            string;
	position:         'bottom-right' | 'bottom-left' | 'side-tab';
	trigger:          'auto' | 'scroll' | 'exit-intent' | 'manual';
	delay:            number;
	scroll_threshold: number;
	show_on_mobile:   boolean;
	survey_id?:       number; // injected by TargetingEngine
}

interface AllfbConfig {
	siteUrl:     string;
	restUrl:     string;
	nonce:       string;
	submitNonce: string;
	version:     string;
	settings:    AllfbSettings;
}

interface SurveyField {
	id:              string;
	type:            'short_text' | 'long_text' | 'radio' | 'checkboxes' | 'star_rating' | 'scale' | 'nps';
	label:           string;
	required:        boolean;
	placeholder?:    string;
	options?:        string[];
	starScale?:      'star' | 'number';
	starRange?:      5 | 10;
	scaleMin?:       number;
	scaleMax?:       number;
	scaleLowLabel?:  string;
	scaleHighLabel?: string;
}

interface FormSection {
	id:     string;
	title:  string;
	fields: SurveyField[];
}

interface FormSchema {
	version:  string;
	sections: FormSection[];
}

interface SurveySettings {
	thankYouEnabled?:     boolean;
	thankYouTitle?:       string;
	thankYouDescription?: string;
	submitLabel?:         string;
	nextLabel?:           string;
	backLabel?:           string;
}

interface Survey {
	id:          number;
	title:       string;
	form_schema: FormSchema | SurveyField[] | null;
	settings:    SurveySettings | null;
}

// ---------------------------------------------------------------------------
// Bootstrap — runs on DOMContentLoaded or immediately if already loaded
// ---------------------------------------------------------------------------

function bootstrap(): void {
	const cfg = ( window as Record<string, unknown> ).__ALLFB__ as AllfbConfig | undefined;
	if ( ! cfg?.settings ) return;

	const { settings } = cfg;

	// Respect show_on_mobile.
	if ( ! settings.show_on_mobile && window.matchMedia( '(max-width: 768px)' ).matches ) {
		return;
	}

	// Mount floating widget if a survey is targeted for this page.
	new AllfbWidget( cfg ).mount();

	// Mount inline embeds rendered by the [allfb_survey] shortcode.
	initEmbeds( cfg );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', bootstrap );
} else {
	bootstrap();
}

// ---------------------------------------------------------------------------
// Inline embed initialiser — finds [allfb_survey] shortcode mount points
// ---------------------------------------------------------------------------

function initEmbeds( cfg: AllfbConfig ): void {
	const mounts = document.querySelectorAll<HTMLElement>( '.allfb-embed[data-survey-id]' );

	mounts.forEach( ( mount ) => {
		const surveyId = parseInt( mount.dataset.surveyId ?? '', 10 );
		const nonce    = mount.dataset.nonce ?? cfg.submitNonce;
		if ( ! surveyId ) return;

		// Apply accent colour from widget settings.
		mount.style.setProperty( '--allfb-color', cfg.settings.color );

		mount.innerHTML = '<div class="allfb-spinner" aria-label="Loading…"></div>';

		fetchAndRender( cfg, surveyId, mount, nonce );
	} );
}

async function fetchAndRender(
	cfg: AllfbConfig,
	surveyId: number,
	container: HTMLElement,
	submitNonce: string,
): Promise<void> {
	try {
		const res = await fetch( `${ cfg.restUrl }surveys/${ surveyId }`, {
			headers: { 'X-WP-Nonce': cfg.nonce },
		} );

		if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );

		const json = await res.json() as { success: boolean; data: Survey };
		if ( ! json.success || ! json.data ) throw new Error( 'Bad response' );

		const survey   = json.data;
		const settings = survey.settings ?? {};
		const tyTitle  = settings.thankYouEnabled && settings.thankYouTitle
			? settings.thankYouTitle
			: 'Thank you!';
		const tyDesc   = settings.thankYouEnabled && settings.thankYouDescription
			? settings.thankYouDescription
			: 'Your response has been recorded.';

		const form = buildForm( cfg, survey, submitNonce, () => {
			container.innerHTML = thankYouHtml( tyTitle, tyDesc );
		} );

		container.innerHTML = '';
		container.appendChild( form );
	} catch {
		container.innerHTML = '<p class="allfb-panel__error">Unable to load survey.</p>';
	}
}

// ---------------------------------------------------------------------------
// Floating widget
// ---------------------------------------------------------------------------

class AllfbWidget {

	private cfg:      AllfbConfig;
	private root:     HTMLDivElement;
	private launcher: HTMLButtonElement;
	private panel:    HTMLDivElement;
	private isOpen  = false;
	private loaded  = false;

	constructor( cfg: AllfbConfig ) {
		this.cfg      = cfg;
		this.root     = this.buildRoot();
		this.launcher = this.buildLauncher();
		this.panel    = this.buildPanel();
	}

	mount(): void {
		// No floating widget if there's no targeted survey.
		if ( ! this.cfg.settings.survey_id ) return;

		this.root.appendChild( this.launcher );
		this.root.appendChild( this.panel );
		document.body.appendChild( this.root );

		const { trigger, delay, scroll_threshold } = this.cfg.settings;

		if ( trigger === 'manual' ) {
			this.root.classList.add( 'is-revealed' );
		} else if ( trigger === 'auto' ) {
			const ms = Math.max( 0, delay ) * 1000;
			setTimeout( () => { this.reveal(); this.open(); }, ms );
		} else if ( trigger === 'scroll' ) {
			this.watchScroll( scroll_threshold );
		} else if ( trigger === 'exit-intent' ) {
			this.watchExitIntent();
		}
	}

	private open(): void {
		this.isOpen = true;
		this.launcher.classList.add( 'is-open' );
		this.launcher.setAttribute( 'aria-expanded', 'true' );
		this.panel.classList.add( 'is-open' );
		this.panel.removeAttribute( 'aria-hidden' );

		if ( ! this.loaded ) {
			this.loaded = true;
			this.loadSurvey();
		}
	}

	private close(): void {
		this.isOpen = false;
		this.launcher.classList.remove( 'is-open' );
		this.launcher.setAttribute( 'aria-expanded', 'false' );
		this.panel.classList.remove( 'is-open' );
		this.panel.setAttribute( 'aria-hidden', 'true' );
	}

	private toggle(): void {
		this.isOpen ? this.close() : this.open();
	}

	private reveal(): void {
		this.root.classList.add( 'is-revealed' );
	}

	// ── DOM ──────────────────────────────────────────────────────────────

	private buildRoot(): HTMLDivElement {
		const el = document.createElement( 'div' );
		el.className = 'allfb-widget';
		el.dataset.position = this.cfg.settings.position;
		el.style.setProperty( '--allfb-color', this.cfg.settings.color );
		return el;
	}

	private buildLauncher(): HTMLButtonElement {
		const { position } = this.cfg.settings;
		const el = document.createElement( 'button' );
		el.type = 'button';
		el.className = 'allfb-launcher';
		el.setAttribute( 'aria-label', 'Open feedback' );
		el.setAttribute( 'aria-expanded', 'false' );
		el.setAttribute( 'aria-controls', 'allfb-panel' );

		if ( position === 'side-tab' ) {
			const span = document.createElement( 'span' );
			span.className = 'allfb-launcher__tab-label';
			span.textContent = 'Feedback';
			el.appendChild( span );
		} else {
			el.innerHTML = msgIcon();
		}

		el.addEventListener( 'click', () => this.toggle() );
		return el;
	}

	private buildPanel(): HTMLDivElement {
		const el = document.createElement( 'div' );
		el.id = 'allfb-panel';
		el.className = 'allfb-panel';
		el.setAttribute( 'aria-hidden', 'true' );
		el.setAttribute( 'role', 'dialog' );
		el.setAttribute( 'aria-modal', 'true' );
		el.setAttribute( 'aria-label', 'Feedback' );

		el.innerHTML = `
			<div class="allfb-panel__header">
				<span class="allfb-panel__title">Feedback</span>
				<button type="button" class="allfb-panel__close" aria-label="Close feedback">
					${ closeIcon() }
				</button>
			</div>
			<div class="allfb-panel__body">
				<div class="allfb-spinner" aria-label="Loading…"></div>
			</div>
		`;

		el.querySelector( '.allfb-panel__close' )!.addEventListener( 'click', () => this.close() );
		return el;
	}

	// ── Survey load ───────────────────────────────────────────────────────

	private loadSurvey(): void {
		const body      = this.panel.querySelector<HTMLElement>( '.allfb-panel__body' )!;
		const surveyId  = this.cfg.settings.survey_id!;

		fetchAndRender( this.cfg, surveyId, body, this.cfg.submitNonce ).catch( () => {
			body.innerHTML = '<p class="allfb-panel__error">Unable to load survey.</p>';
		} );
	}

	// ── Trigger helpers ───────────────────────────────────────────────────

	private watchScroll( threshold: number ): void {
		const onScroll = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			const pct = max > 0 ? ( window.scrollY / max ) * 100 : 0;
			if ( pct >= threshold ) {
				this.reveal();
				window.removeEventListener( 'scroll', onScroll );
			}
		};
		window.addEventListener( 'scroll', onScroll, { passive: true } );
	}

	private watchExitIntent(): void {
		const onLeave = ( e: MouseEvent ) => {
			if ( e.clientY <= 5 ) {
				this.reveal();
				document.removeEventListener( 'mouseleave', onLeave );
			}
		};
		document.addEventListener( 'mouseleave', onLeave );
	}
}

// ---------------------------------------------------------------------------
// Shared form builder (used by both widget and shortcode embed)
// Mirrors the logic in admin/pages/forms/builder/PreviewPanel.tsx
// ---------------------------------------------------------------------------

/** Strip a single wrapping <p>…</p> so labels render inline-cleanly. */
function normalizeLabel( html: string ): string {
	const t = html.trim();
	if ( t.startsWith( '<p>' ) && t.endsWith( '</p>' ) && t.indexOf( '<p>', 1 ) === -1 ) {
		return t.slice( 3, -4 );
	}
	return t;
}

function escHtml( s: string ): string {
	return s.replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
}

function buildForm(
	cfg: AllfbConfig,
	survey: Survey,
	submitNonce: string,
	onSuccess: () => void,
): HTMLElement {
	// ── Extract sections from the schema ────────────────────────────────────
	const rawSchema = survey.form_schema as any;
	const rawSections: FormSection[] = Array.isArray( rawSchema )
		? [ { id: 'default', title: '', fields: rawSchema as SurveyField[] } ]
		: ( rawSchema?.sections ?? [] );

	// Filter out empty sections (mirrors activeSections() in PreviewPanel)
	const sections = ( rawSections as FormSection[] ).filter( ( s ) => s.fields.length > 0 );

	if ( sections.length === 0 ) {
		const p = document.createElement( 'p' );
		p.className = 'allfb-panel__placeholder';
		p.textContent = 'This survey has no questions yet.';
		return p;
	}

	const ss          = survey.settings ?? {};
	const submitLabel = ss.submitLabel || 'Submit';
	const nextLabel   = ss.nextLabel   || 'Next';
	const backLabel   = ss.backLabel   || 'Back';
	const totalSteps  = sections.length;

	// ── State ────────────────────────────────────────────────────────────────
	let stepIndex = 0;
	const fieldValues: Record<string, string | string[]> = {};
	const fieldErrors: Record<string, string>            = {};

	// ── Wrapper ──────────────────────────────────────────────────────────────
	const wrapper   = document.createElement( 'div' );
	wrapper.className = 'allfb-form-wrapper';

	const stepsEl   = document.createElement( 'div' );
	stepsEl.className = 'allfb-steps';

	const fieldsEl  = document.createElement( 'div' );
	fieldsEl.className = 'allfb-form__fields';

	const footerEl  = document.createElement( 'div' );
	footerEl.className = 'allfb-form__footer';

	if ( totalSteps > 1 ) wrapper.appendChild( stepsEl );
	wrapper.appendChild( fieldsEl );
	wrapper.appendChild( footerEl );

	// ── Validate current step ────────────────────────────────────────────────
	const validateStep = (): boolean => {
		let valid = true;
		sections[ stepIndex ].fields.forEach( ( field ) => {
			if ( ! field.required ) return;
			const val   = fieldValues[ field.id ];
			const empty = ! val || ( Array.isArray( val ) ? val.length === 0 : ! ( val as string ).trim() );
			if ( empty ) {
				fieldErrors[ field.id ] = 'This field is required.';
				valid = false;
			}
		} );
		return valid;
	};

	// ── Render the current step ──────────────────────────────────────────────
	const render = (): void => {
		const section    = sections[ stepIndex ];
		const isLastStep = stepIndex === totalSteps - 1;

		// Step indicators
		if ( totalSteps > 1 ) {
			stepsEl.innerHTML = '';
			const dotsEl = document.createElement( 'div' );
			dotsEl.className = 'allfb-steps__dots';
			sections.forEach( ( _, i ) => {
				const dot = document.createElement( 'span' );
				dot.className = 'allfb-steps__dot'
					+ ( i === stepIndex ? ' is-active' : ( i < stepIndex ? ' is-done' : '' ) );
				dotsEl.appendChild( dot );
			} );
			const countEl = document.createElement( 'span' );
			countEl.className = 'allfb-steps__count';
			countEl.textContent = `${ stepIndex + 1 } / ${ totalSteps }`;
			stepsEl.appendChild( dotsEl );
			stepsEl.appendChild( countEl );
		}

		// Fields
		fieldsEl.innerHTML = '';
		section.fields.forEach( ( field ) => {
			const initVal = fieldValues[ field.id ] ?? ( field.type === 'checkboxes' ? [] : '' );
			const error   = fieldErrors[ field.id ] ?? '';
			const fieldEl = buildField( field, initVal as string | string[], error, ( newVal ) => {
				fieldValues[ field.id ]  = newVal;
				fieldErrors[ field.id ] = '';
				const errEl = fieldEl.querySelector<HTMLElement>( '.allfb-field__error' );
				if ( errEl ) errEl.textContent = '';
			} );
			fieldsEl.appendChild( fieldEl );
		} );

		// Footer
		footerEl.innerHTML = '';

		if ( stepIndex > 0 ) {
			const backBtn = document.createElement( 'button' );
			backBtn.type = 'button';
			backBtn.className = 'allfb-btn allfb-btn--secondary';
			backBtn.textContent = backLabel;
			backBtn.addEventListener( 'click', () => { stepIndex--; render(); } );
			footerEl.appendChild( backBtn );
		}

		if ( isLastStep ) {
			const submitBtn = document.createElement( 'button' );
			submitBtn.type = 'button';
			submitBtn.className = 'allfb-btn allfb-btn--primary';
			submitBtn.textContent = submitLabel;

			submitBtn.addEventListener( 'click', async () => {
				if ( ! validateStep() ) { render(); return; }

				submitBtn.disabled    = true;
				submitBtn.textContent = 'Submitting…';

				// Collect values from all steps
				const responseData: Record<string, string | string[]> = {};
				sections.forEach( ( s ) => s.fields.forEach( ( f ) => {
					if ( fieldValues[ f.id ] !== undefined ) responseData[ f.id ] = fieldValues[ f.id ];
				} ) );

				try {
					const res = await fetch( `${ cfg.restUrl }surveys/${ survey.id }/submit`, {
						method:  'POST',
						headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': cfg.nonce },
						body: JSON.stringify( { nonce: submitNonce, response_data: responseData, page_url: window.location.href } ),
					} );
					if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );
					onSuccess();
				} catch {
					submitBtn.disabled    = false;
					submitBtn.textContent = submitLabel;
					let errMsg = footerEl.querySelector<HTMLElement>( '.allfb-form__submit-error' );
					if ( ! errMsg ) {
						errMsg = document.createElement( 'p' );
						errMsg.className = 'allfb-form__submit-error';
						footerEl.insertAdjacentElement( 'afterbegin', errMsg );
					}
					errMsg.textContent = 'Submission failed. Please try again.';
				}
			} );

			footerEl.appendChild( submitBtn );
		} else {
			const nextBtn = document.createElement( 'button' );
			nextBtn.type = 'button';
			nextBtn.className = 'allfb-btn allfb-btn--primary';
			nextBtn.textContent = nextLabel;
			nextBtn.addEventListener( 'click', () => {
				if ( ! validateStep() ) { render(); return; }
				stepIndex++;
				render();
			} );
			footerEl.appendChild( nextBtn );
		}
	};

	render();
	return wrapper;
}

function buildField(
	field:    SurveyField,
	value:    string | string[],
	error:    string,
	onChange: ( value: string | string[] ) => void,
): HTMLElement {
	const wrap = document.createElement( 'div' );
	wrap.className = 'allfb-field';

	// Label — rendered as HTML to support rich-text labels from the builder
	const labelEl = document.createElement( 'div' );
	labelEl.className = 'allfb-field__label';
	const labelHtml = field.label?.trim()
		? normalizeLabel( field.label )
		: '<span style="opacity:0.4">Untitled</span>';
	labelEl.innerHTML = labelHtml;
	if ( field.required ) {
		const req = document.createElement( 'span' );
		req.className = 'allfb-field__required';
		req.textContent = ' *';
		labelEl.appendChild( req );
	}
	wrap.appendChild( labelEl );

	// Error placeholder
	const errEl = document.createElement( 'p' );
	errEl.className = 'allfb-field__error';
	errEl.textContent = error;

	const strVal = typeof value === 'string' ? value : '';
	const arrVal = Array.isArray( value ) ? value : [];

	switch ( field.type ) {

		case 'short_text': {
			const inp = document.createElement( 'input' );
			inp.type        = 'text';
			inp.className   = 'allfb-input' + ( error ? ' is-error' : '' );
			inp.placeholder = field.placeholder ?? '';
			inp.value       = strVal;
			inp.addEventListener( 'input', () => onChange( inp.value ) );
			wrap.appendChild( inp );
			break;
		}

		case 'long_text': {
			const ta = document.createElement( 'textarea' );
			ta.className   = 'allfb-textarea' + ( error ? ' is-error' : '' );
			ta.placeholder = field.placeholder ?? '';
			ta.rows        = 3;
			ta.value       = strVal;
			ta.addEventListener( 'input', () => onChange( ta.value ) );
			wrap.appendChild( ta );
			break;
		}

		case 'radio': {
			const group = document.createElement( 'div' );
			group.className = 'allfb-options';
			( field.options ?? [] ).forEach( ( opt, idx ) => {
				const label = document.createElement( 'label' );
				label.className = 'allfb-option';

				const inp = document.createElement( 'input' );
				inp.type    = 'radio';
				inp.name    = field.id;
				inp.value   = opt;
				inp.id      = `allfb-f-${ field.id }-${ idx }`;
				inp.checked = strVal === opt;
				inp.className = 'sr-only';

				const indicator = document.createElement( 'span' );
				indicator.className = 'allfb-option__radio' + ( strVal === opt ? ' is-checked' : '' );

				inp.addEventListener( 'change', () => {
					group.querySelectorAll<HTMLElement>( '.allfb-option__radio' )
						.forEach( ( el ) => el.classList.remove( 'is-checked' ) );
					indicator.classList.add( 'is-checked' );
					onChange( opt );
				} );

				const text = document.createElement( 'span' );
				text.className   = 'allfb-option__text';
				text.textContent = opt || `Option ${ idx + 1 }`;

				label.appendChild( inp );
				label.appendChild( indicator );
				label.appendChild( text );
				group.appendChild( label );
			} );
			wrap.appendChild( group );
			break;
		}

		case 'checkboxes': {
			const group = document.createElement( 'div' );
			group.className = 'allfb-options';
			( field.options ?? [] ).forEach( ( opt, idx ) => {
				const label = document.createElement( 'label' );
				label.className = 'allfb-option';

				const inp = document.createElement( 'input' );
				inp.type    = 'checkbox';
				inp.name    = field.id;
				inp.value   = opt;
				inp.id      = `allfb-f-${ field.id }-${ idx }`;
				inp.checked = arrVal.includes( opt );
				inp.className = 'sr-only';

				const indicator = document.createElement( 'span' );
				indicator.className = 'allfb-option__checkbox' + ( arrVal.includes( opt ) ? ' is-checked' : '' );

				inp.addEventListener( 'change', () => {
					indicator.classList.toggle( 'is-checked', inp.checked );
					const current: string[] = [];
					group.querySelectorAll<HTMLInputElement>( 'input[type="checkbox"]' )
						.forEach( ( cb ) => { if ( cb.checked ) current.push( cb.value ); } );
					onChange( current );
				} );

				const text = document.createElement( 'span' );
				text.className   = 'allfb-option__text';
				text.textContent = opt || `Option ${ idx + 1 }`;

				label.appendChild( inp );
				label.appendChild( indicator );
				label.appendChild( text );
				group.appendChild( label );
			} );
			wrap.appendChild( group );
			break;
		}

		case 'star_rating': {
			const scale    = field.starScale ?? 'star';
			const range    = field.starRange ?? 5;
			const selected = Number( strVal ) || 0;

			const group  = document.createElement( 'div' );
			group.className = 'allfb-stars';
			const hidden = document.createElement( 'input' );
			hidden.type  = 'hidden';
			hidden.name  = field.id;
			hidden.value = strVal;

			for ( let n = 1; n <= range; n++ ) {
				const btn = document.createElement( 'button' );
				btn.type = 'button';
				btn.className = 'allfb-star' + ( n <= selected ? ' is-active' : '' )
					+ ( scale === 'number' ? ' allfb-star--number' : '' );
				btn.dataset.n = String( n );
				btn.setAttribute( 'aria-label', `${ n } star${ n !== 1 ? 's' : '' }` );
				btn.innerHTML = scale === 'number' ? String( n ) : starSvg();

				btn.addEventListener( 'click', () => {
					const cur    = Number( hidden.value ) || 0;
					const newVal = cur === n ? 0 : n;
					hidden.value = String( newVal );
					group.querySelectorAll<HTMLElement>( '.allfb-star' ).forEach( ( b, i ) => {
						b.classList.toggle( 'is-active', i + 1 <= newVal );
					} );
					onChange( String( newVal ) );
				} );

				group.appendChild( btn );
			}
			group.appendChild( hidden );
			wrap.appendChild( group );
			break;
		}

		case 'scale': {
			const min      = field.scaleMin ?? 0;
			const max      = field.scaleMax ?? 10;
			const selected = strVal !== '' ? Number( strVal ) : null;
			const points   = Array.from( { length: max - min + 1 }, ( _, i ) => min + i );

			const group   = document.createElement( 'div' );
			group.className = 'allfb-scale';
			const hidden  = document.createElement( 'input' );
			hidden.type   = 'hidden';
			hidden.name   = field.id;
			hidden.value  = strVal;
			const btnsRow = document.createElement( 'div' );
			btnsRow.className = 'allfb-scale__btns';

			points.forEach( ( n ) => {
				const btn = document.createElement( 'button' );
				btn.type = 'button';
				btn.className = 'allfb-scale__btn' + ( selected !== null && n <= selected ? ' is-active' : '' );
				btn.textContent = String( n );

				btn.addEventListener( 'click', () => {
					const cur    = hidden.value !== '' ? Number( hidden.value ) : null;
					const newVal = cur === n ? '' : String( n );
					hidden.value = newVal;
					const newSel = newVal !== '' ? Number( newVal ) : null;
					btnsRow.querySelectorAll<HTMLElement>( '.allfb-scale__btn' ).forEach( ( b, i ) => {
						b.classList.toggle( 'is-active', newSel !== null && points[ i ] <= newSel );
					} );
					onChange( newVal );
				} );

				btnsRow.appendChild( btn );
			} );

			group.appendChild( btnsRow );
			group.appendChild( hidden );

			if ( field.scaleLowLabel || field.scaleHighLabel ) {
				const labelsRow = document.createElement( 'div' );
				labelsRow.className = 'allfb-scale__labels';
				if ( field.scaleLowLabel ) {
					const lo = document.createElement( 'span' );
					lo.textContent = field.scaleLowLabel;
					labelsRow.appendChild( lo );
				}
				if ( field.scaleHighLabel ) {
					const hi = document.createElement( 'span' );
					hi.className   = 'allfb-scale__label--high';
					hi.textContent = field.scaleHighLabel;
					labelsRow.appendChild( hi );
				}
				group.appendChild( labelsRow );
			}

			wrap.appendChild( group );
			break;
		}

		case 'nps': {
			const selected = strVal !== '' ? Number( strVal ) : null;

			const group   = document.createElement( 'div' );
			group.className = 'allfb-scale allfb-scale--nps';
			const hidden  = document.createElement( 'input' );
			hidden.type   = 'hidden';
			hidden.name   = field.id;
			hidden.value  = strVal;
			const btnsRow = document.createElement( 'div' );
			btnsRow.className = 'allfb-scale__btns';

			for ( let n = 0; n <= 10; n++ ) {
				const btn = document.createElement( 'button' );
				btn.type = 'button';
				const sentiment = n <= 6 ? 'detractor' : n <= 8 ? 'passive' : 'promoter';
				btn.className = `allfb-scale__btn allfb-scale__btn--nps allfb-scale__btn--${ sentiment }`
					+ ( selected === n ? ' is-active' : '' );
				btn.textContent = String( n );

				btn.addEventListener( 'click', () => {
					const cur    = hidden.value !== '' ? Number( hidden.value ) : null;
					const newVal = cur === n ? '' : String( n );
					hidden.value = newVal;
					const newSel = newVal !== '' ? Number( newVal ) : null;
					btnsRow.querySelectorAll<HTMLElement>( '.allfb-scale__btn--nps' ).forEach( ( b ) => {
						b.classList.toggle( 'is-active', newSel !== null && Number( b.textContent ) === newSel );
					} );
					onChange( newVal );
				} );

				btnsRow.appendChild( btn );
			}

			const labelsRow = document.createElement( 'div' );
			labelsRow.className = 'allfb-scale__labels';
			const lo = document.createElement( 'span' );
			lo.textContent = 'Not at all likely';
			const hi = document.createElement( 'span' );
			hi.className   = 'allfb-scale__label--high';
			hi.textContent = 'Extremely likely';
			labelsRow.appendChild( lo );
			labelsRow.appendChild( hi );

			group.appendChild( btnsRow );
			group.appendChild( labelsRow );
			group.appendChild( hidden );
			wrap.appendChild( group );
			break;
		}

		default: {
			const inp = document.createElement( 'input' );
			inp.type      = 'text';
			inp.className = 'allfb-input';
			inp.value     = strVal;
			inp.addEventListener( 'input', () => onChange( inp.value ) );
			wrap.appendChild( inp );
		}
	}

	wrap.appendChild( errEl );
	return wrap;
}

function thankYouHtml( title: string, description: string ): string {
	return `
		<div class="allfb-thankyou">
			<div class="allfb-thankyou__check">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"/></svg>
			</div>
			<p class="allfb-thankyou__title">${ escHtml( title ) }</p>
			<p class="allfb-thankyou__desc">${ escHtml( description ) }</p>
		</div>
	`;
}

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

function starSvg(): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
}

function msgIcon(): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
}

function closeIcon(): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
}
