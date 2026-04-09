/**
 * queries/surveys.ts — TanStack Query definitions for surveys
 */

import { surveysApi } from '@/admin/api/surveys';
import type { SurveyListParams } from '@/admin/api/surveys';

export const surveysQuery = (params?: SurveyListParams) => ({
	queryKey: ['surveys', params ?? {}] as const,
	queryFn:  () => surveysApi.list(params),
});

export const surveyQuery = (id: number) => ({
	queryKey: ['surveys', id] as const,
	queryFn:  () => surveysApi.get(id),
});
