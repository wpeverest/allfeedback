import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings/general')({
	component: lazyRouteComponent(() => import('@/admin/pages/settings/GeneralSettings')),
});
