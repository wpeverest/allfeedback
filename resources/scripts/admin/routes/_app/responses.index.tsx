import { allResponsesQuery, surveyResponsesQuery, surveysQuery } from '@/admin/queries/surveys';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

const DEFAULT_RESPONSE_PARAMS = { page: 1, per_page: 10 };

export const Route = createFileRoute('/_app/responses/')({
	validateSearch: (search: Record<string, unknown>) => {
		let rawId = search.surveyId;
		if ((rawId === undefined || rawId === null) && typeof window !== 'undefined') {
			const qi = window.location.hash.indexOf('?');
			if (qi !== -1) {
				rawId = new URLSearchParams(window.location.hash.slice(qi + 1)).get('surveyId') ?? undefined;
			}
		}
		const id = rawId !== undefined && rawId !== null ? Number(rawId) : undefined;
		return { surveyId: id !== undefined && Number.isFinite(id) && id > 0 ? id : undefined };
	},
	loaderDeps: ({ search }) => ({ surveyId: search.surveyId }),
	loader: ({ context: { queryClient }, deps: { surveyId } }) => {
		const responsesPreload = surveyId !== undefined
			? queryClient.ensureQueryData(surveyResponsesQuery(surveyId, DEFAULT_RESPONSE_PARAMS))
			: queryClient.ensureQueryData(allResponsesQuery(DEFAULT_RESPONSE_PARAMS));

		return Promise.all([
			queryClient.ensureQueryData(surveysQuery({ per_page: 100 })).catch(() => undefined),
			responsesPreload.catch(() => undefined),
		]);
	},
	component: lazyRouteComponent(() => import('@/admin/pages/responses/Responses')),
});
