import type { SurveyConfig, WidgetState } from './types';

export class StateManager {

	private state:      WidgetState;
	private surveyId:   number;
	private restUrl:    string;
	private nonce:      string;
	private isLoggedIn: boolean;
	private readonly localKey: string;

	constructor( surveyConfig: SurveyConfig, restUrl: string, nonce: string ) {
		this.surveyId   = surveyConfig.id;
		this.restUrl    = restUrl;
		this.nonce      = nonce;
		this.isLoggedIn = surveyConfig.is_logged_in ?? false;
		this.localKey   = `allfeedback_w_${ surveyConfig.id }`;

		if ( this.isLoggedIn && surveyConfig.server_state ) {
			this.state = this.mergeWithLocal( surveyConfig.server_state );
			this.writeLocal( this.state );
		} else {
			this.state = this.readLocal();
		}
	}

	getState(): WidgetState {
		return this.state;
	}

	recordImpression(): void {
		this.state = { ...this.state, impressions: this.state.impressions + 1 };
		this.persist( 'impression' );
	}

	recordDismissal(): void {
		this.state = { ...this.state, dismissed_at: Date.now() };
		this.persist( 'dismiss' );
	}

	recordSubmit(): void {
		this.state = { ...this.state, submitted: true };
		this.persist( 'submit' );
	}

	private mergeWithLocal( server: WidgetState ): WidgetState {
		const local = this.readLocal();
		return {
			impressions:  Math.max( local.impressions, server.impressions ),
			submitted:    local.submitted || server.submitted,
			dismissed_at: server.dismissed_at ?? local.dismissed_at,
		};
	}

	private persist( action: string ): void {
		this.writeLocal( this.state );
		if ( this.isLoggedIn ) {
			fetch( `${ this.restUrl }surveys/${ this.surveyId }/state`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': this.nonce },
				body:    JSON.stringify( { action } ),
			} ).catch( () => {} );
		}
	}

	private readLocal(): WidgetState {
		try {
			const raw = localStorage.getItem( this.localKey );
			if ( raw ) return JSON.parse( raw ) as WidgetState;
		} catch {}
		return { impressions: 0, submitted: false, dismissed_at: null };
	}

	private writeLocal( state: WidgetState ): void {
		try {
			localStorage.setItem( this.localKey, JSON.stringify( state ) );
		} catch {}
	}
}
