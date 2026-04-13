import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings/widget')({
	component: lazyRouteComponent(() => import('@/admin/pages/settings/WidgetSettings')),
});
