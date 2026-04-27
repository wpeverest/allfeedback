import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/analytics/')({
	validateSearch: (search: Record<string, unknown>) => {
		const id = Number(search.formId);
		return { formId: Number.isFinite(id) && id > 0 ? id : undefined };
	},
	component: lazyRouteComponent(() => import('@/admin/pages/analytics/Analytics')),
});
