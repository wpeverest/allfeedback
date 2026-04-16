import { useEffect, useState } from 'react';
import { normalizeSettings } from '../utils';
import type { AllfbConfig, Survey } from '../types';
import { SurveyForm } from './SurveyForm';

type PanelStatus = 'loading' | 'loaded' | 'submitted' | 'error';

interface SurveyPanelProps {
	cfg:         AllfbConfig;
	surveyId:    number;
	submitNonce: string;
	onSubmit?:   () => void;
}

const ThankYou = ( { title, description }: { title: string; description: string } ) => (
	<div className="allfb-thankyou">
		<div className="allfb-thankyou__check">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
				<polyline points="20 6 9 17 4 12" />
			</svg>
		</div>
		<p className="allfb-thankyou__title">{ title }</p>
		<p className="allfb-thankyou__desc">{ description }</p>
	</div>
);

export const SurveyPanel = ( { cfg, surveyId, submitNonce, onSubmit }: SurveyPanelProps ) => {
	const [ status, setStatus ] = useState<PanelStatus>( 'loading' );
	const [ survey, setSurvey ] = useState<Survey | null>( null );

	useEffect( () => {
		let cancelled = false;

		fetch( `${ cfg.restUrl }surveys/${ surveyId }`, {
			headers: { 'X-WP-Nonce': cfg.nonce },
		} )
			.then( ( res ) => {
				if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );
				return res.json() as Promise<{ success: boolean; data: Survey }>;
			} )
			.then( ( json ) => {
				if ( cancelled ) return;
				if ( ! json.success || ! json.data ) throw new Error( 'Bad response' );
				setSurvey( json.data );
				setStatus( 'loaded' );
			} )
			.catch( () => {
				if ( ! cancelled ) setStatus( 'error' );
			} );

		return () => { cancelled = true; };
	}, [ cfg, surveyId ] );

	const handleSuccess = () => {
		onSubmit?.();
		setStatus( 'submitted' );
	};

	if ( status === 'loading' ) {
		return <div className="allfb-spinner" aria-label="Loading…" />;
	}

	if ( status === 'error' ) {
		return <p className="allfb-panel__error">Unable to load survey.</p>;
	}

	if ( status === 'submitted' && survey ) {
		const ss = normalizeSettings( survey.settings );
		return (
			<ThankYou
				title={ ss.thankYouEnabled ? ss.thankYouTitle : 'Thank you!' }
				description={ ss.thankYouEnabled ? ss.thankYouDescription : 'Your response has been recorded.' }
			/>
		);
	}

	if ( status === 'loaded' && survey ) {
		return (
			<SurveyForm
				cfg={ cfg }
				survey={ survey }
				submitNonce={ submitNonce }
				onSuccess={ handleSuccess }
			/>
		);
	}

	return null;
};
