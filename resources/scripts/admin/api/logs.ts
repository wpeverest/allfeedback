import { request, toQuery } from './client';
import type { PaginationParams } from './client';

export type LogFile = {
	id:      string;
	name:    string;
	size:    string;
	bytes:   number;
	entries: number;
	date:    string;
};

export type LogFileDetail = LogFile & {
	content: string;
};

export type LogListResponse = {
	logs:  LogFile[];
	total: number;
	page:  number;
	pages: number;
};

export type LogListParams = PaginationParams & {
	orderby?: 'date' | 'name' | 'size';
	order?:   'asc' | 'desc';
	search?:  string;
};

export type DeleteLogResponse = {
	deleted: boolean;
	id:      string;
};

export type BulkDeleteLogResponse = {
	deleted: string[];
	skipped: string[];
	failed:  string[];
};

export const logsApi = {
	list: (params?: LogListParams) =>
		request<LogListResponse>('/logs' + toQuery(params)),

	get: (id: string) =>
		request<LogFileDetail>(`/logs/${id}`),

	delete: (id: string) =>
		request<DeleteLogResponse>(`/logs/${id}`, { method: 'DELETE' }),

	bulkDelete: (ids: string[]) =>
		request<BulkDeleteLogResponse>('/logs/delete', { method: 'DELETE', data: { ids } }),
};
