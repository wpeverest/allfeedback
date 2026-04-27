import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/analytics/')({
	validateSearch: (search: Record<string, unknown>) => {
		let rawId = search.formId;
		if ((rawId === undefined || rawId === null) && typeof window !== 'undefined') {
			const qi = window.location.hash.indexOf('?');
			if (qi !== -1) {
				rawId = new URLSearchParams(window.location.hash.slice(qi + 1)).get('formId') ?? undefined;
			}
		}
		const id = rawId !== undefined && rawId !== null ? Number(rawId) : undefined;
		return { formId: id !== undefined && Number.isFinite(id) && id > 0 ? id : undefined };
	},
	loaderDeps: ({ search }) => ({ formId: search.formId }),
	loader: () => Promise.resolve(),
	component: lazyRouteComponent(() => import('@/admin/pages/analytics/Analytics')),
});
