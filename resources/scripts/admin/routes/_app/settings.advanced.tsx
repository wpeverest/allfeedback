import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings/advanced')({
	component: lazyRouteComponent(() => import('@/admin/pages/settings/AdvancedSettings')),
});
