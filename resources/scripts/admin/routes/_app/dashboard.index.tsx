import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/dashboard/')({
	component: lazyRouteComponent(() => import('@/admin/pages/dashboard/Dashboard')),
});
