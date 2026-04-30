import fetchMock from 'jest-fetch-mock';
import { toQuery } from '@/admin/api/client';

// request() wraps @wordpress/api-fetch — mock it directly
jest.mock('@wordpress/api-fetch', () =>
	jest.fn().mockResolvedValue({ success: true, data: { id: 1 } }),
);

import apiFetch from '@wordpress/api-fetch';
import { request } from '@/admin/api/client';

describe('request', () => {
	afterEach(() => jest.clearAllMocks());

	it('returns the data field from a successful response', async () => {
		const result = await request<{ id: number }>('/surveys');
		expect(result).toEqual({ id: 1 });
	});

	it('passes the path with namespace prefix to apiFetch', async () => {
		await request('/surveys');
		expect(apiFetch).toHaveBeenCalledWith(
			expect.objectContaining({ path: '/allfeedback/v1/surveys' }),
		);
	});

	it('forwards extra options to apiFetch', async () => {
		await request('/surveys', { method: 'POST', data: { title: 'Test' } });
		expect(apiFetch).toHaveBeenCalledWith(
			expect.objectContaining({ method: 'POST', data: { title: 'Test' } }),
		);
	});

	it('propagates rejection from apiFetch', async () => {
		(apiFetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
		await expect(request('/surveys')).rejects.toThrow('Network error');
	});
});

describe('toQuery', () => {
	it('returns empty string for undefined', () => {
		expect(toQuery(undefined)).toBe('');
	});

	it('returns empty string for empty object', () => {
		expect(toQuery({})).toBe('');
	});

	it('builds query string', () => {
		expect(toQuery({ page: 1, per_page: 10 })).toBe('?page=1&per_page=10');
	});

	it('filters null and undefined', () => {
		expect(toQuery({ a: 'x', b: null, c: undefined })).toBe('?a=x');
	});
});

// Verify jest-fetch-mock is wired (used in SurveyForm tests)
describe('fetch mock', () => {
	beforeEach(() => fetchMock.resetMocks());

	it('intercepts fetch calls', async () => {
		fetchMock.mockResponseOnce(JSON.stringify({ ok: true }));
		const res = await fetch('/test');
		const body = await res.json();
		expect(body).toEqual({ ok: true });
	});
});
