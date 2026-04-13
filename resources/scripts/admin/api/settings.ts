import { request } from './client';

export type Settings = {
	plugin_name:        string;
	data_retention:     'forever' | '30d' | '90d' | '180d' | '1y';
	delete_on_uninstall: boolean;

	widget_position:    'bottom-right' | 'bottom-left' | 'bottom-center' | 'side-tab';
	widget_trigger:     'auto' | 'scroll' | 'exit-intent' | 'manual';
	widget_delay:       number;
	scroll_threshold:   number;
	show_on_mobile:     boolean;

	logging_enabled:    boolean;
	log_level:          'error' | 'warning' | 'info' | 'debug';
	log_retention_days: number;
};

export const settingsApi = {
	get: () =>
		request<Settings>('/settings'),

	update: (data: Partial<Settings>) =>
		request<Settings>('/settings', { method: 'PATCH', data }),
};
