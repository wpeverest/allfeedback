import { surveysApi } from '@/admin/api/surveys';
import type { ResponseListParams, SurveyListParams } from '@/admin/api/surveys';

export const surveysQuery = (params?: SurveyListParams) => ({
	queryKey:  ['surveys', params ?? {}] as const,
	queryFn:   () => surveysApi.list(params),
	staleTime: 60_000,
});

export const surveyQuery = (id: number) => ({
	queryKey: ['surveys', id] as const,
	queryFn:  () => surveysApi.get(id),
	staleTime: 30_000,
});

export const allResponsesQuery = (params?: ResponseListParams) => ({
	queryKey:  ['responses', 'all', params ?? {}] as const,
	queryFn:   () => surveysApi.listAllResponses(params),
	staleTime: 30_000,
});

export const surveyResponsesQuery = (surveyId: number, params?: ResponseListParams) => ({
	queryKey:  ['responses', surveyId, params ?? {}] as const,
	queryFn:   () => surveysApi.listResponses(surveyId, params),
	staleTime: 30_000,
});

export const surveyResponseQuery = (surveyId: number, responseId: number) => ({
	queryKey:  ['responses', surveyId, responseId] as const,
	queryFn:   () => surveysApi.getResponse(surveyId, responseId),
	staleTime: 30_000,
});

export const unreadCountQuery = () => ({
	queryKey:             ['responses', 'unread-count'] as const,
	queryFn:              () => surveysApi.getUnreadCount(),
	refetchInterval:      60_000,       // poll every 60 s to catch new submissions
	refetchOnWindowFocus: true,
	staleTime:            30_000,
});
