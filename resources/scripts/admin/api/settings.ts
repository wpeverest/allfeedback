/**
 * api/settings.ts — Settings resource API
 *
 * Mirrors the SettingsManager::DEFAULTS keys on the PHP side.
 * Extend the Settings type as you add more options.
 */

import { request } from './client';

// ── Types ──────────────────────────────────────────────────────────────

export type Settings = {
	plugin_name:   string;
	sample_option: string;
	sample_bool:   boolean;
	sample_int:    number;
};

// ── API object ─────────────────────────────────────────────────────────

export const settingsApi = {
	get: () =>
		request<Settings>('/settings'),

	update: (data: Partial<Settings>) =>
		request<Settings>('/settings', { method: 'PATCH', data }),
};
