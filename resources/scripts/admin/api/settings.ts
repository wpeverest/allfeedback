import { request } from './client';

export type Settings = {
	general: {
		widget: {
			color:            string;
			position:         'bottom-right' | 'bottom-left' | 'side-tab';
			trigger:          'auto' | 'scroll' | 'exit-intent' | 'manual';
			delay:            number;
			scroll_threshold: number;
			show_on_mobile:   boolean;
		};
	};
	advanced: {
		privacy: {
			disable_user_details: boolean;
		};
		logging: {
			enabled:        boolean;
			level:          'error' | 'warning' | 'info' | 'debug';
			retention_days: number;
		};
		plugin: {
			delete_on_uninstall:  boolean;
			allow_usage_tracking: boolean;
		};
	};
};

/** Deeply-partial payload accepted by PATCH /settings. Send only what changed. */
export type SettingsUpdatePayload = {
	general?: {
		widget?: Partial<Settings['general']['widget']>;
	};
	advanced?: {
		privacy?: Partial<Settings['advanced']['privacy']>;
		logging?: Partial<Settings['advanced']['logging']>;
		plugin?:  Partial<Settings['advanced']['plugin']>;
	};
};

export const settingsApi = {
	get: () =>
		request<Settings>('/settings'),

	update: (data: SettingsUpdatePayload) =>
		request<Settings>('/settings', { method: 'PATCH', data }),
};
