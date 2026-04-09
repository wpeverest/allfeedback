/**
 * api/surveys.ts — Surveys resource API
 */

import { request, toQuery } from './client';
import type { PaginatedMeta, PaginationParams } from './client';

// ── Types ──────────────────────────────────────────────────────────────

export type SurveyStatus = 'draft' | 'published' | 'paused' | 'archived';

export type Survey = {
	id:             number;
	title:          string;
	description:    string;
	form_schema:    SurveyFormSchema | null;
	settings:       Record<string, unknown> | null;
	targeting:      unknown[] | null;
	status:         SurveyStatus;
	response_count: number;
	created_by:     number;
	created_at:     string;
	updated_at:     string | null;
};

export type SurveyFormSchemaField = {
	id:       string;
	type:     string;
	label:    string;
	required: boolean;
	settings: Record<string, unknown>;
};

export type SurveyFormSchemaSection = {
	id:     string;
	title:  string;
	fields: SurveyFormSchemaField[];
};

export type SurveyFormSchema = {
	version:  string;
	sections: SurveyFormSchemaSection[];
};

export type SurveyListResponse = PaginatedMeta & {
	surveys: Survey[];
};

export type SurveyListParams = PaginationParams & {
	search?:  string;
	status?:  string;
	orderby?: string;
	order?:   'ASC' | 'DESC';
};

export type CreateSurveyData = {
	title:        string;
	description?: string;
	form_schema?: SurveyFormSchema;
	settings?:    Record<string, unknown>;
	targeting?:   unknown[];
};

export type UpdateSurveyData = Partial<CreateSurveyData> & {
	status?: SurveyStatus;
};

export type DeleteSurveyResponse = {
	deleted: boolean;
	id:      number;
	force:   boolean;
};

// ── API object ─────────────────────────────────────────────────────────

export const surveysApi = {
	list: (params?: SurveyListParams) =>
		request<SurveyListResponse>('/surveys' + toQuery(params)),

	get: (id: number) =>
		request<Survey>(`/surveys/${id}`),

	create: (data: CreateSurveyData) =>
		request<Survey>('/surveys', { method: 'POST', data }),

	update: (id: number, data: UpdateSurveyData) =>
		request<Survey>(`/surveys/${id}`, { method: 'PUT', data }),

	delete: (id: number, force = false) =>
		request<DeleteSurveyResponse>(`/surveys/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),

	duplicate: (id: number) =>
		request<Survey>(`/surveys/${id}/duplicate`, { method: 'POST' }),

	publish: (id: number) =>
		request<Survey>(`/surveys/${id}/publish`, { method: 'POST' }),

	pause: (id: number) =>
		request<Survey>(`/surveys/${id}/pause`, { method: 'POST' }),
};
