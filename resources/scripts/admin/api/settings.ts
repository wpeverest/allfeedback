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
			enabled:         boolean;
			level:           'error' | 'warning' | 'info' | 'debug';
			retention_days:  number;
		};
		plugin: {
			delete_on_uninstall:  boolean;
			allow_usage_tracking: boolean;
		};
	};
};

type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

export const settingsApi = {
	get: () =>
		request<Settings>('/settings'),

	update: (data: DeepPartial<Settings>) =>
		request<Settings>('/settings', { method: 'PATCH', data }),
};
