import { allResponsesQuery, surveyResponsesQuery, surveysQuery } from '@/admin/queries/surveys';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

let _hashFallback = true;
if (typeof window !== 'undefined') {
	window.addEventListener('allfeedback:navigate', () => { _hashFallback = false; }, { once: true });
}

export const Route = createFileRoute('/_app/responses/')({
	validateSearch: (search: Record<string, unknown>) => {
		let rawId = search.surveyId;
		if (_hashFallback && (rawId === undefined || rawId === null) && typeof window !== 'undefined') {
			const qi = window.location.hash.indexOf('?');
			if (qi !== -1) rawId = new URLSearchParams(window.location.hash.slice(qi + 1)).get('surveyId') ?? undefined;
		}
		const id = rawId !== undefined && rawId !== null ? Number(rawId) : undefined;
		return { surveyId: id !== undefined && Number.isFinite(id) && id > 0 ? id : undefined };
	},
	loaderDeps: ({ search: { surveyId } }) => ({ surveyId }),
	loader: ({ context: { queryClient }, deps: { surveyId } }) =>
		Promise.all([
			queryClient.ensureQueryData(surveysQuery({ per_page: 100 })).catch(() => undefined),
			surveyId
				? queryClient.ensureQueryData(surveyResponsesQuery(surveyId, { page: 1, per_page: 10 })).catch(() => undefined)
				: queryClient.ensureQueryData(allResponsesQuery({ page: 1, per_page: 10 })).catch(() => undefined),
		]),
	component: lazyRouteComponent(() => import('@/admin/pages/responses/Responses')),
});
