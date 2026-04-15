import { surveyQuery, surveyResponseQuery } from '@/admin/queries/surveys';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/responses/$responseId')({
	validateSearch: (search: Record<string, unknown>) => ({
		surveyId: search.surveyId !== undefined ? Number(search.surveyId) : 0,
		edit:     search.edit === true || search.edit === 'true',
	}),
	loaderDeps: ({ search }) => ({ surveyId: search.surveyId }),
	loader: ({ context: { queryClient }, params: { responseId }, deps: { surveyId } }) =>
		Promise.all([
			queryClient.ensureQueryData(surveyQuery(surveyId)).catch(() => undefined),
			queryClient
				.ensureQueryData(surveyResponseQuery(surveyId, Number(responseId)))
				.catch(() => undefined),
		]),
	component: lazyRouteComponent(
		() => import('@/admin/pages/responses/ResponseDetail'),
	),
});
