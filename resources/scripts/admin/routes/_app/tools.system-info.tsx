import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tools/system-info')({
	component: lazyRouteComponent(() => import('@/admin/pages/tools/SystemInfo')),
});
