/**
 * api/client.ts — Base API client
 *
 * Wraps @wordpress/api-fetch with the plugin REST namespace so all
 * resource modules only need to pass a relative path like '/sample'.
 */

import apiFetch from '@wordpress/api-fetch';

const NAMESPACE = '/all-feedback/v1';

type ApiResponse<T> = {
	success: boolean;
	data:    T;
};

export type PaginationParams = {
	page?:     number;
	per_page?: number;
};

export type PaginatedMeta = {
	total:    number;
	page:     number;
	per_page: number;
};

/** Perform a typed request against the plugin REST API. */
export async function request<T>(
	path: string,
	options?: Parameters<typeof apiFetch>[0],
): Promise<T> {
	const res = await apiFetch<ApiResponse<T>>({
		path: `${NAMESPACE}${path}`,
		...options,
	});
	return res.data;
}

/** Serialise a params object to a query string (skips null/undefined). */
export function toQuery(params?: Record<string, unknown>): string {
	if (!params) return '';
	const entries = Object.entries(params).filter(
		([, v]) => v !== undefined && v !== null,
	);
	if (!entries.length) return '';
	return (
		'?' +
		new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
	);
}
