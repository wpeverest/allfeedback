/**
 * api/sample.ts — Sample resource API
 *
 * Demonstrates CRUD calls against the /sample REST endpoint provided
 * by SampleController. Replace with your actual resource types.
 */

import { request, toQuery } from './client';
import type { PaginatedMeta, PaginationParams } from './client';

// ── Types ──────────────────────────────────────────────────────────────

export type SampleItem = {
	id:         number;
	name:       string;
	created_at: string;
	updated_at: string | null;
};

export type SampleListResponse = PaginatedMeta & { items: SampleItem[] };

export type SampleListParams = PaginationParams & {
	search?: string;
};

export type CreateSampleData = {
	name: string;
};

// ── API object ─────────────────────────────────────────────────────────

export const sampleApi = {
	list: (params?: SampleListParams) =>
		request<SampleListResponse>('/sample' + toQuery(params)),

	get: (id: number) =>
		request<SampleItem>(`/sample/${id}`),

	create: (data: CreateSampleData) =>
		request<SampleItem>('/sample', { method: 'POST', data }),
};
