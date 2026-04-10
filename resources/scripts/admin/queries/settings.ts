import { settingsApi } from '@/admin/api/settings';

export const settingsQuery = () => ({
	queryKey: ['settings'] as const,
	queryFn:  settingsApi.get,
	meta:     { suppressToast: true },
});
