import { request } from './client';

export type WizardStatus = {
	status: 'not_started' | 'pending_redirect' | 'initiated' | 'completed';
};

export type WizardCompletePayload = {
	template:     string;
	brand_color:  string;
	position:     string;
	shape:        'circle' | 'rounded' | 'pill';
	admin_email:  string;
	from_name:    string;
	from_email:   string;
	consent:      boolean;
	anonymize_ip: boolean;
	retention:    string;
};

export const wizardApi = {
	getStatus: () =>
		request<WizardStatus>( '/wizard' ),

	complete: ( data: WizardCompletePayload ) =>
		request<{ status: string; id?: number }>( '/wizard/complete', { method: 'POST', data } ),
};

export const WIZARD_STATUS_QUERY_KEY = [ 'wizard', 'status' ] as const;
