/**
 * All Feedback Survey — Gutenberg block editor script.
 *
 * Registers the `allfeedback/survey` block.
 * The block has a single attribute `surveyId` (number).
 * Rendering is delegated to the PHP render callback (server-side render).
 *
 * @see blocks/allfb-survey/block.json
 * @see src/Frontend/FrontendServiceProvider.php – renderSurveyBlock()
 */

import { registerBlockType }            from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	ComboboxControl,
	Placeholder,
	Spinner,
	Notice,
}                                        from '@wordpress/components';
import { useState, useEffect }           from '@wordpress/element';
import { __ }                            from '@wordpress/i18n';
import apiFetch                          from '@wordpress/api-fetch';
import type { BlockEditProps }           from '@wordpress/blocks';
import metadata                          from '../../../blocks/allfb-survey/block.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Attributes {
	surveyId: number;
}

interface SurveyOption {
	value:  string;
	label:  string;
	status: string;
}

interface SurveyRow {
	id:     number;
	title:  string;
	status: string;
}

// ---------------------------------------------------------------------------
// Edit component
// ---------------------------------------------------------------------------

function Edit( { attributes, setAttributes }: BlockEditProps<Attributes> ) {
	const { surveyId } = attributes;
	const blockProps    = useBlockProps( { className: 'allfb-block-editor' } );

	const [ options, setOptions ] = useState<SurveyOption[]>( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error,   setError   ] = useState( '' );
	const [ filter,  setFilter  ] = useState( '' );

	// Fetch all surveys once on mount
	useEffect( () => {
		apiFetch<{ success: boolean; data: { surveys: SurveyRow[] } }>( {
			path: '/all-feedback/v1/surveys?per_page=100',
		} )
			.then( ( json ) => {
				const surveys = json?.data?.surveys ?? [];
				setOptions(
					surveys
						.filter( ( s ) => s.status !== 'trashed' )
						.map( ( s ) => ( {
							value:  String( s.id ),
							label:  s.title || `Survey #${ s.id }`,
							status: s.status,
						} ) ),
				);
			} )
			.catch( () => setError( __( 'Could not load surveys. Check your permissions.', 'all-feedback' ) ) )
			.finally( () => setLoading( false ) );
	}, [] );

	const selectedOption = options.find( ( o ) => o.value === String( surveyId ) );

	// Filtered options for ComboboxControl
	const filteredOptions = filter
		? options.filter( ( o ) => o.label.toLowerCase().includes( filter.toLowerCase() ) )
		: options;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Survey', 'all-feedback' ) } initialOpen>
					{ error ? (
						<Notice status="error" isDismissible={ false }>{ error }</Notice>
					) : loading ? (
						<Spinner />
					) : (
						<ComboboxControl
							label={ __( 'Select survey', 'all-feedback' ) }
							help={ __( 'Only published surveys render on the frontend.', 'all-feedback' ) }
							value={ surveyId ? String( surveyId ) : '' }
							options={ filteredOptions }
							onFilterValueChange={ ( v ) => setFilter( v ?? '' ) }
							onChange={ ( val ) =>
								setAttributes( { surveyId: val ? parseInt( val, 10 ) : 0 } )
							}
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ surveyId > 0 ? (
					<div className="allfb-block-preview">
						<span className="allfb-block-preview__badge">
							{ __( 'All Feedback', 'all-feedback' ) }
						</span>
						<span className="allfb-block-preview__name">
							{ selectedOption
								? selectedOption.label
								: `Survey #${ surveyId }` }
						</span>
						{ selectedOption && selectedOption.status !== 'published' && (
							<span className="allfb-block-preview__draft">
								{ '(' + selectedOption.status + ')' }
							</span>
						) }
					</div>
				) : (
					<Placeholder
						icon="megaphone"
						label={ __( 'All Feedback Survey', 'all-feedback' ) }
						instructions={ __(
							'Select a survey using the block settings panel on the right.',
							'all-feedback',
						) }
					/>
				) }
			</div>
		</>
	);
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

registerBlockType( metadata.name as string, {
	edit: Edit,
	save: () => null, // server-side render via PHP render callback
} );
