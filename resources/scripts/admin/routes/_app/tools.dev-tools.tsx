import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tools/dev-tools')({
	component: lazyRouteComponent(() => import('@/admin/pages/tools/DevTools')),
});
