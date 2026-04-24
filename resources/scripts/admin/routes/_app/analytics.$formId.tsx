import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/analytics/$formId')({
	component: lazyRouteComponent(() => import('@/admin/pages/analytics/FormAnalytics')),
});
