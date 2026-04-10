import { request } from './client';

export type Settings = {
	plugin_name:   string;
	sample_option: string;
	sample_bool:   boolean;
	sample_int:    number;
};

export const settingsApi = {
	get: () =>
		request<Settings>('/settings'),

	update: (data: Partial<Settings>) =>
		request<Settings>('/settings', { method: 'PATCH', data }),
};
