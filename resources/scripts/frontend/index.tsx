import '../../styles/frontend.pcss';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StateManager } from './state';
import type { AllfbConfig, SurveyConfig } from './types';
import { Widget } from './components/Widget';
import { EmbedRoot } from './components/EmbedRoot';

function checkAudience( surveyConfig: SurveyConfig ): boolean {
	const showTo = surveyConfig.show_to ?? 'all';
	if ( showTo === 'all' ) return true;
	const isLoggedIn = document.body.classList.contains( 'logged-in' );
	return showTo === 'logged_in' ? isLoggedIn : ! isLoggedIn;
}

function checkFrequency( surveyConfig: SurveyConfig, stateManager: StateManager ): boolean {
	const { display_frequency, max_impressions, reshow_after_days } = surveyConfig;

	if ( ! display_frequency || ( display_frequency === 'until_submit' && ! max_impressions && ! reshow_after_days ) ) {
		return true;
	}

	const state = stateManager.getState();

	if ( state.submitted ) return false;

	if ( display_frequency === 'once' && state.impressions >= 1 ) return false;

	if ( display_frequency === 'until_submit' ) {
		if ( max_impressions && state.impressions >= max_impressions ) return false;

		if ( reshow_after_days && state.dismissed_at ) {
			const cooldownMs = reshow_after_days * 24 * 60 * 60 * 1000;
			if ( Date.now() - state.dismissed_at < cooldownMs ) return false;
		}
	}

	return true;
}

function initWidget( cfg: AllfbConfig, surveyConfig: SurveyConfig, stateManager: StateManager ): void {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );

	createRoot( container ).render(
		<StrictMode>
			<Widget
				cfg={ cfg }
				surveyConfig={ surveyConfig }
				stateManager={ stateManager }
			/>
		</StrictMode>,
	);
}

function initEmbeds( cfg: AllfbConfig ): void {
	const mounts = document.querySelectorAll<HTMLElement>( '.allfb-embed[data-survey-id]' );

	mounts.forEach( ( mount ) => {
		const surveyId = parseInt( mount.dataset.surveyId ?? '', 10 );
		const nonce    = mount.dataset.nonce ?? cfg.submitNonce;
		if ( ! surveyId ) return;

		mount.style.setProperty( '--allfb-color', cfg.settings.color );

		createRoot( mount ).render(
			<StrictMode>
				<EmbedRoot cfg={ cfg } surveyId={ surveyId } nonce={ nonce } />
			</StrictMode>,
		);
	} );
}

function bootstrap(): void {
	const cfg = ( window as Record<string, unknown> ).__ALLFB__ as AllfbConfig | undefined;
	if ( ! cfg?.settings ) return;

	const { settings } = cfg;

	if ( ! settings.show_on_mobile && window.matchMedia( '(max-width: 768px)' ).matches ) {
		return;
	}

	const surveyConfigs: SurveyConfig[] = settings.survey_configs?.length
		? settings.survey_configs
		: settings.survey_id
			? [ { id: settings.survey_id, is_logged_in: false } ]
			: [];

	for ( const surveyConfig of surveyConfigs ) {
		const stateManager = new StateManager( surveyConfig, cfg.restUrl, cfg.nonce );
		if ( checkAudience( surveyConfig ) && checkFrequency( surveyConfig, stateManager ) ) {
			initWidget( cfg, surveyConfig, stateManager );
			break;
		}
	}

	initEmbeds( cfg );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', bootstrap );
} else {
	bootstrap();
}
