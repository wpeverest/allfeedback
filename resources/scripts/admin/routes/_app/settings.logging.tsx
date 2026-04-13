import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings/logging')({
	component: lazyRouteComponent(() => import('@/admin/pages/settings/LoggingSettings')),
});
