import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/analytics/')({
	component: lazyRouteComponent(() => import('@/admin/pages/analytics/Analytics')),
});
