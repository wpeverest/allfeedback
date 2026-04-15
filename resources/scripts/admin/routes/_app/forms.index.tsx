import { surveysQuery } from '@/admin/queries/surveys';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/forms/')({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(
			surveysQuery({ page: 1, per_page: 10, orderby: 'created_at', order: 'DESC' }),
		).catch(() => undefined),
	component: lazyRouteComponent(() => import('@/admin/pages/forms/AllForms')),
});
