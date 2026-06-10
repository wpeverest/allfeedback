import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/about/')({
	component: lazyRouteComponent(() => import('@/admin/pages/about/About')),
});
