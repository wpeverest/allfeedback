import { analyticsFormDetailQuery, analyticsFormsQuery, analyticsOverviewQuery } from '@/admin/queries/analytics';
import { allResponsesQuery } from '@/admin/queries/surveys';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

let _hashFallback = true;
if (typeof window !== 'undefined') {
	window.addEventListener('allfeedback:navigate', () => { _hashFallback = false; }, { once: true });
}

export const Route = createFileRoute('/_app/analytics/')({
	validateSearch: (search: Record<string, unknown>) => {
		let rawId = search.formId;
		if (_hashFallback && (rawId === undefined || rawId === null) && typeof window !== 'undefined') {
			const qi = window.location.hash.indexOf('?');
			if (qi !== -1) rawId = new URLSearchParams(window.location.hash.slice(qi + 1)).get('formId') ?? undefined;
		}
		const id = rawId !== undefined && rawId !== null ? Number(rawId) : undefined;
		return { formId: id !== undefined && Number.isFinite(id) && id > 0 ? id : undefined };
	},
	loaderDeps: ({ search: { formId } }) => ({ formId }),
	loader: ({ context: { queryClient }, deps: { formId } }) =>
		Promise.all([
			queryClient.ensureQueryData(analyticsFormsQuery({ per_page: 100 })).catch(() => undefined),
			queryClient.ensureQueryData(analyticsOverviewQuery()).catch(() => undefined),
			queryClient.ensureQueryData(allResponsesQuery({ per_page: 5 })).catch(() => undefined),
			formId
				? queryClient.ensureQueryData(analyticsFormDetailQuery(formId)).catch(() => undefined)
				: Promise.resolve(undefined),
		]),
	component: lazyRouteComponent(() => import('@/admin/pages/analytics/Analytics')),
});
