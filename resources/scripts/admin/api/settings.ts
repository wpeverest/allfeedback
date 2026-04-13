import { request } from './client';

export type Settings = {
	delete_on_uninstall:  boolean;
	allow_usage_tracking: boolean;

	disable_user_details: boolean;

	widget_color:         string;
	widget_position:      'bottom-right' | 'bottom-left' | 'side-tab';
	widget_trigger:       'auto' | 'scroll' | 'exit-intent' | 'manual';
	widget_delay:         number;
	scroll_threshold:     number;
	show_on_mobile:       boolean;

	logging_enabled:      boolean;
	log_level:            'error' | 'warning' | 'info' | 'debug';
	log_retention_days:   number;
};

export const settingsApi = {
	get: () =>
		request<Settings>('/settings'),

	update: (data: Partial<Settings>) =>
		request<Settings>('/settings', { method: 'PATCH', data }),
};
