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
