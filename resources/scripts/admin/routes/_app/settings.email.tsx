import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings/email')({
	component: lazyRouteComponent(() => import('@/admin/pages/settings/EmailSettings')),
});
