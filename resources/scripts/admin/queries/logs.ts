import { logsApi } from '@/admin/api/logs';
import type { LogListParams } from '@/admin/api/logs';

export const logsQuery = (params?: LogListParams) => ({
	queryKey:  ['logs', params ?? {}] as const,
	queryFn:   () => logsApi.list(params),
	staleTime: 30_000,
});

export const logQuery = (id: string) => ({
	queryKey:  ['logs', id] as const,
	queryFn:   () => logsApi.get(id),
	staleTime: 5 * 60_000,
});
