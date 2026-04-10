/**
 * api/surveys.ts — Surveys resource API
 */

import { request, toQuery } from './client';
import type { PaginatedMeta, PaginationParams } from './client';

// ── Types ──────────────────────────────────────────────────────────────

export type SurveyStatus = 'draft' | 'published' | 'paused' | 'archived' | 'trashed';

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

export type TrashSurveyResponse = {
	trashed: boolean;
	id:      number;
};

export type DeleteSurveyResponse = {
	deleted: boolean;
	id:      number;
};

export type BulkTrashResponse = {
	trashed: number;
	skipped: number[];
	failed:  number[];
};

export type BulkDeleteResponse = {
	deleted: number;
	skipped: number[];
	failed:  number[];
};

export type SurveyResponse = {
	id:            number;
	survey_id:     number;
	response_data: Record<string, unknown> | null;
	score:         number | null;
	page_url:      string | null;
	device_type:   string | null;
	user_id:       number | null;
	consent_given: boolean;
	created_at:    string;
};

export type ResponseListResponse = PaginatedMeta & {
	responses: SurveyResponse[];
};

export type ResponseListParams = PaginationParams & {
	date_from?: string;
	date_to?:   string;
};

export type DeleteResponseResult = {
	deleted: boolean;
	id:      number;
};

export type SubmitFormData = {
	nonce:         string;
	response_data: Record<string, unknown>;
	score?:        number;
	page_url?:     string;
	device_type?:  string;
};

export type SubmitFormResult = {
	id:         number;
	survey_id:  number;
	created_at: string;
};

export type ContentSearchItem = {
	id:    number;
	title: string;
	type:  string;
	url:   string;
};

export type ContentSearchResponse = PaginatedMeta & {
	items: ContentSearchItem[];
};

export type ContentSearchParams = {
	search?:    string;
	post_type?: string;
	page?:      number;
	per_page?:  number;
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

	/** Move a single survey to trash (status → trashed). Returns 409 if already trashed. */
	trash: (id: number) =>
		request<TrashSurveyResponse>(`/surveys/${id}/trash`, { method: 'DELETE' }),

	/** Permanently delete a single survey. Must be trashed first — returns 409 otherwise. */
	delete: (id: number) =>
		request<DeleteSurveyResponse>(`/surveys/${id}/delete`, { method: 'DELETE' }),

	/** Bulk-move surveys to trash. Already-trashed IDs are silently skipped. */
	bulkTrash: (ids: number[]) =>
		request<BulkTrashResponse>('/surveys/trash', { method: 'DELETE', data: { ids } }),

	/** Bulk permanently delete surveys. Non-trashed IDs are silently skipped. */
	bulkDelete: (ids: number[]) =>
		request<BulkDeleteResponse>('/surveys/delete', { method: 'DELETE', data: { ids } }),

	duplicate: (id: number) =>
		request<Survey>(`/surveys/${id}/duplicate`, { method: 'POST' }),

	publish: (id: number) =>
		request<Survey>(`/surveys/${id}/publish`, { method: 'POST' }),

	pause: (id: number) =>
		request<Survey>(`/surveys/${id}/pause`, { method: 'POST' }),

	contentSearch: (params?: ContentSearchParams) =>
		request<ContentSearchResponse>('/content-search' + toQuery(params)),

	listAllResponses: (params?: ResponseListParams) =>
		request<ResponseListResponse>('/responses' + toQuery(params)),

	listResponses: (surveyId: number, params?: ResponseListParams) =>
		request<ResponseListResponse>(`/surveys/${surveyId}/responses` + toQuery(params)),

	deleteResponse: (surveyId: number, responseId: number) =>
		request<DeleteResponseResult>(`/surveys/${surveyId}/responses/${responseId}`, { method: 'DELETE' }),

	submit: (surveyId: number, data: SubmitFormData) =>
		request<SubmitFormResult>(`/surveys/${surveyId}/submit`, { method: 'POST', data }),
};
