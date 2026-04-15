/**
 * All Feedback Survey — Gutenberg block editor script.
 *
 * Architecture note
 * -----------------
 * PHP renders only a lightweight mount-point div (<div class="allfb-embed">)
 * in ALL contexts — shortcode, block frontend, block editor.  The interactive
 * frontend widget (frontend/index.ts) then hydrates that div with the full
 * form DOM + event listeners.
 *
 * For the EDITOR CANVAS we want a static visual preview, not a live form.
 * Instead of duplicating the rendering logic in PHP (which drifts), we import
 * surveyPreviewHtml() from the shared formPreview module — the same TypeScript
 * code used everywhere — and render it via dangerouslySetInnerHTML.
 *
 * If you add or change a field type, update formPreview.ts.  The editor
 * preview and the frontend widget will then both reflect the change because
 * they share the same CSS class conventions.
 *
 * @see resources/scripts/shared/formPreview.ts  – surveyPreviewHtml()
 * @see resources/scripts/frontend/index.ts      – buildForm / buildField
 * @see src/Frontend/FrontendServiceProvider.php – renderSurveyBlock()
 */

import { registerBlockType }               from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	ComboboxControl,
	Placeholder,
	Spinner,
	Notice,
}                                           from '@wordpress/components';
import { useState, useEffect, useMemo }     from '@wordpress/element';
import { __ }                               from '@wordpress/i18n';
import apiFetch                             from '@wordpress/api-fetch';
import type { BlockEditProps }              from '@wordpress/blocks';
import metadata                             from '../../../../blocks/allfb-survey/block.json';
import { surveyPreviewHtml }                from '../../shared/formPreview';
import type { PreviewSurvey }               from '../../shared/formPreview';

// ---------------------------------------------------------------------------
// Plugin colour setting injected by PHP (registerBlock → wp_add_inline_script).
// Falls back to the CSS default if not available (e.g. in Storybook / tests).
// ---------------------------------------------------------------------------
const BLOCK_CFG     = ( window as unknown as Record<string, unknown> ).__ALLFB_BLOCK__ as { color?: string } | undefined;
const ACCENT_COLOR  = BLOCK_CFG?.color ?? '#6366f1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SurveyListItem {
	id:     number;
	title:  string;
	status: string;
}

interface SurveyOption {
	value:             string;
	label:             string;
	status:            string;
	[key: string]: unknown;
}

interface Attributes {
	surveyId:          number;
	[key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Edit component
// ---------------------------------------------------------------------------

function Edit( { attributes, setAttributes }: BlockEditProps<Attributes> ) {
	const { surveyId } = attributes;
	const blockProps    = useBlockProps();

	// Sidebar: survey list for the ComboboxControl.
	const [ options,        setOptions        ] = useState<SurveyOption[]>( [] );
	const [ loadingOptions, setLoadingOptions ] = useState( true );
	const [ optionsError,   setOptionsError   ] = useState( '' );
	const [ filter,         setFilter         ] = useState( '' );

	// Canvas: full survey data fetched for generating the preview HTML.
	const [ survey,         setSurvey         ] = useState<PreviewSurvey | null>( null );
	const [ loadingPreview, setLoadingPreview  ] = useState( false );

	// Fetch survey list once on mount.
	useEffect( () => {
		apiFetch<{ success: boolean; data: { surveys: SurveyListItem[] } }>( {
			path: '/all-feedback/v1/surveys?per_page=100',
		} )
			.then( ( json ) => {
				setOptions(
					( json?.data?.surveys ?? [] )
						.filter( ( s ) => s.status !== 'trashed' )
						.map( ( s ) => ( {
							value:  String( s.id ),
							label:  s.title || `Survey #${ s.id }`,
							status: s.status,
						} ) ),
				);
			} )
			.catch( () => setOptionsError( __( 'Could not load surveys.', 'all-feedback' ) ) )
			.finally( () => setLoadingOptions( false ) );
	}, [] );

	// Re-fetch full survey data whenever the selected survey changes.
	useEffect( () => {
		if ( ! surveyId ) { setSurvey( null ); return; }
		setLoadingPreview( true );
		setSurvey( null );
		apiFetch<{ success: boolean; data: PreviewSurvey }>( {
			path: `/all-feedback/v1/surveys/${ surveyId }`,
		} )
			.then( ( json ) => setSurvey( json?.data ?? null ) )
			.catch( () => setSurvey( null ) )
			.finally( () => setLoadingPreview( false ) );
	}, [ surveyId ] );

	const filteredOptions = filter
		? options.filter( ( o ) => o.label.toLowerCase().includes( filter.toLowerCase() ) )
		: options;

	// Build preview HTML from the shared renderer — memoised so it only
	// recomputes when survey or accent colour changes.
	const previewHtml = useMemo(
		() => ( survey ? surveyPreviewHtml( survey, ACCENT_COLOR ) : '' ),
		[ survey ]
	);

	return (
		<>
			{/* ── Sidebar ─────────────────────────────────────────────── */}
			<InspectorControls>
				<PanelBody title={ __( 'Survey', 'all-feedback' ) } initialOpen>
					{ optionsError ? (
						<Notice status="error" isDismissible={ false }>{ optionsError }</Notice>
					) : loadingOptions ? (
						<Spinner />
					) : (
						<ComboboxControl
							label={ __( 'Select survey', 'all-feedback' ) }
							help={ __( 'Only published surveys render on the frontend.', 'all-feedback' ) }
							value={ surveyId ? String( surveyId ) : '' }
							options={ filteredOptions }
							onFilterValueChange={ ( v: string | null ) => setFilter( v ?? '' ) }
							onChange={ ( val: string | null ) =>
								setAttributes( { surveyId: val ? parseInt( val, 10 ) : 0 } )
							}
						/>
					) }
				</PanelBody>
			</InspectorControls>

			{/* ── Canvas ──────────────────────────────────────────────── */}
			<div { ...blockProps }>
				{ surveyId === 0 ? (

					<Placeholder
						icon="megaphone"
						label={ __( 'All Feedback Survey', 'all-feedback' ) }
						instructions={ __(
							'Select a survey using the block settings panel on the right.',
							'all-feedback',
						) }
					/>

				) : loadingPreview ? (

					<div style={ { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 80, padding: 16 } }>
						<Spinner />
						<span style={ { fontSize: 13, color: '#6b7280' } }>
							{ __( 'Loading preview…', 'all-feedback' ) }
						</span>
					</div>

				) : previewHtml ? (

					// dangerouslySetInnerHTML is intentional and safe here:
					// the HTML is generated by our own surveyPreviewHtml() function,
					// not from user input or external sources.
					<div dangerouslySetInnerHTML={ { __html: previewHtml } } />

				) : (

					<div className="allfb-embed">
						<p className="allfb-panel__error">
							{ __( 'Survey not found.', 'all-feedback' ) }
						</p>
					</div>

				) }
			</div>
		</>
	);
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null, // server-side render via PHP render callback
} );
