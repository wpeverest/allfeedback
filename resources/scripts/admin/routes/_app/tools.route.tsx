import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tools')({
	component: lazyRouteComponent(() => import('@/admin/pages/tools/Tools')),
});
