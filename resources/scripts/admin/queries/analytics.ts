import { analyticsApi } from '@/admin/api/analytics';
import type { FormAnalyticsListParams } from '@/admin/api/analytics';

export const analyticsFormsQuery = (params?: FormAnalyticsListParams) => ({
	queryKey: ['analytics', 'forms', params ?? {}] as const,
	queryFn:  () => analyticsApi.listForms(params),
});

export const analyticsFormDetailQuery = (id: number) => ({
	queryKey: ['analytics', 'forms', id] as const,
	queryFn:  () => analyticsApi.getFormAnalytics(id),
});
