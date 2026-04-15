import { settingsQuery } from '@/admin/queries/settings';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings')({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(settingsQuery()),
	component: lazyRouteComponent(() => import('@/admin/pages/settings/Settings')),
});
