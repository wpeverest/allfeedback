import { useRef, useState } from 'react';
import { activeSections, normalizeSettings, parseSections, trackEvent } from '../utils';
import type { AllfbConfig, Survey } from '../types';
import { FieldPreview } from './FieldPreview';

function getOrCreateVisitorId(): string {
	const KEY = 'allfb_visitor_id';
	let id = localStorage.getItem( KEY );
	if ( ! id ) {
		id = Math.random().toString( 36 ).slice( 2 ) + Date.now().toString( 36 );
		try { localStorage.setItem( KEY, id ); } catch { /* storage blocked */ }
	}
	return id;
}

interface SurveyFormProps {
	cfg:               AllfbConfig;
	survey:            Survey;
	submitNonce:       string;
	sessionId?:        string;
	onSuccess:         () => void;
	alreadySubmitted?: boolean;
}

export const SurveyForm = ( { cfg, survey, submitNonce, sessionId, onSuccess, alreadySubmitted = false }: SurveyFormProps ) => {
	const sections    = activeSections( parseSections( survey.form_schema ) );
	const ss          = normalizeSettings( survey.settings );
	const totalSteps  = sections.length;

	const [ stepIndex,    setStepIndex    ] = useState( 0 );
	const [ fieldValues,  setFieldValues  ] = useState<Record<string, string | string[]>>( {} );
	const [ fieldErrors,  setFieldErrors  ] = useState<Record<string, string>>( {} );
	const [ isSubmitting, setIsSubmitting ] = useState( false );
	const [ submitError,  setSubmitError  ] = useState( '' );

	const hasStartedRef = useRef( false );

	if ( sections.length === 0 ) {
		return <p className="allfb-panel__placeholder">This survey has no questions yet.</p>;
	}

	const isLastStep      = stepIndex === totalSteps - 1;
	const currentSection  = sections[ stepIndex ];

	const handleChange = ( fieldId: string, value: string | string[] ) => {
		setFieldValues( ( prev ) => ( { ...prev, [ fieldId ]: value } ) );
		setFieldErrors( ( prev ) => ( { ...prev, [ fieldId ]: '' } ) );
		if ( ! hasStartedRef.current && sessionId ) {
			hasStartedRef.current = true;
			void trackEvent( cfg.restUrl, cfg.nonce, survey.id, 'started', sessionId );
		}
	};

	const validateStep = (): Record<string, string> => {
		const errors: Record<string, string> = {};
		currentSection.fields.forEach( ( field ) => {
			if ( ! field.required ) return;
			const val   = fieldValues[ field.id ];
			const empty = ! val || ( Array.isArray( val ) ? val.length === 0 : ! val.trim() );
			if ( empty ) errors[ field.id ] = 'This field is required.';
		} );
		return errors;
	};

	const handleNext = () => {
		const errors = validateStep();
		if ( Object.keys( errors ).length ) { setFieldErrors( errors ); return; }
		setFieldErrors( {} );
		setStepIndex( ( s ) => s + 1 );
	};

	const handleBack = () => {
		setFieldErrors( {} );
		setStepIndex( ( s ) => s - 1 );
	};

	const handleKeyDown = ( e: React.KeyboardEvent ) => {
		if ( e.key !== 'Enter' ) return;
		if ( ( e.target as HTMLElement ).tagName === 'TEXTAREA' ) return;
		if ( isSubmitting ) return;
		e.preventDefault();
		if ( isLastStep ) handleSubmit(); else handleNext();
	};

	const handleSubmit = async () => {
		const errors = validateStep();
		if ( Object.keys( errors ).length ) { setFieldErrors( errors ); return; }
		setFieldErrors( {} );
		setIsSubmitting( true );
		setSubmitError( '' );

		const responseData: Record<string, string | string[]> = {};
		sections.forEach( ( s ) => s.fields.forEach( ( f ) => {
			responseData[ f.id ] = fieldValues[ f.id ] ?? ( f.type === 'checkboxes' ? [] : '' );
		} ) );

		const allFields = sections.flatMap( ( s ) => s.fields );
		const scoreField = allFields.find( ( f ) => f.type === 'nps' || f.type === 'star_rating' || f.type === 'scale' );
		const rawScore   = scoreField ? fieldValues[ scoreField.id ] : undefined;
		const score      = rawScore !== undefined && rawScore !== '' && ! Array.isArray( rawScore )
			? Number( rawScore )
			: undefined;

		try {
			const res = await fetch( `${ cfg.restUrl }surveys/${ survey.id }/submit`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': cfg.nonce },
				body:    JSON.stringify( {
					nonce:         submitNonce,
					response_data: responseData,
					page_url:      window.location.href,
					visitor_token: getOrCreateVisitorId(),
					...( score !== undefined && ! Number.isNaN( score ) ? { score } : {} ),
					...( sessionId ? { session_id: sessionId } : {} ),
				} ),
			} );
			if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );
			onSuccess();
		} catch {
			setIsSubmitting( false );
			setSubmitError( 'Submission failed. Please try again.' );
		}
	};

	return (
		<div className="allfb-form-wrapper" onKeyDown={ handleKeyDown }>
			{ totalSteps > 1 && ss.progressIndicator !== 'none' && (
				<div className={ `allfb-steps${ ss.progressIndicator === 'bar' ? ' allfb-steps--bar' : '' }` }>
					{ ss.progressIndicator === 'dots' && (
						<div className="allfb-steps__dots">
							{ sections.map( ( _, i ) => (
								<span
									key={ i }
									className={ `allfb-steps__dot${ i === stepIndex ? ' is-active' : i < stepIndex ? ' is-done' : '' }` }
								/>
							) ) }
						</div>
					) }
					{ ss.progressIndicator === 'numbers' && (
						<span className="allfb-steps__count allfb-steps__count">{ stepIndex + 1 } / { totalSteps }</span>
					) }
					{ ss.progressIndicator === 'bar' && (
						<div className="allfb-steps__bar-track">
							<div
								className="allfb-steps__bar-fill"
								style={ { width: `${ ( ( stepIndex + 1 ) / totalSteps ) * 100 }%` } }
							/>
						</div>
					) }
				</div>
			) }

			<div className="allfb-form__fields">
				{ ( () => {
					const firstErrorId = currentSection.fields.find( ( f ) => fieldErrors[ f.id ] )?.id;
					return currentSection.fields.map( ( field ) => (
						<FieldPreview
							key={ field.id }
							field={ field }
							value={ fieldValues[ field.id ] ?? ( field.type === 'checkboxes' ? [] : '' ) }
							error={ fieldErrors[ field.id ] ?? '' }
							focusFirst={ field.id === firstErrorId }
							onChange={ ( val ) => handleChange( field.id, val ) }
						/>
					) );
				} )() }
			</div>

			<div className="allfb-form__footer">
				{ submitError && <p className="allfb-form__submit-error">{ submitError }</p> }
				{ stepIndex > 0 && (
					<button type="button" className="allfb-btn allfb-btn--secondary" onClick={ handleBack }>
						{ ss.backLabel }
					</button>
				) }
				{ isLastStep ? (
					<button
						type="button"
						className="allfb-btn allfb-btn--primary"
						disabled={ isSubmitting || alreadySubmitted }
						onClick={ handleSubmit }
					>
						{ alreadySubmitted ? 'Already submitted' : isSubmitting ? 'Submitting…' : ss.submitLabel }
					</button>
				) : (
					<button type="button" className="allfb-btn allfb-btn--primary" onClick={ handleNext }>
						{ ss.nextLabel }
					</button>
				) }
			</div>
		</div>
	);
};
