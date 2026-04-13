import { request } from './client';

export type Settings = {
	data_retention:      'forever' | '30d' | '90d' | '180d' | '1y';
	delete_on_uninstall: boolean;

	widget_color:        string;
	widget_position:     'bottom-right' | 'bottom-left' | 'bottom-center' | 'side-tab';
	widget_trigger:      'auto' | 'scroll' | 'exit-intent' | 'manual';
	widget_delay:        number;
	scroll_threshold:    number;
	show_on_mobile:      boolean;

	collect_ip:          boolean;
	ip_anonymization:    boolean;
	consent_required:    boolean;
	consent_text:        string;

	logging_enabled:     boolean;
	log_level:           'error' | 'warning' | 'info' | 'debug';
	log_retention_days:  number;
};

export const settingsApi = {
	get: () =>
		request<Settings>('/settings'),

	update: (data: Partial<Settings>) =>
		request<Settings>('/settings', { method: 'PATCH', data }),
};
