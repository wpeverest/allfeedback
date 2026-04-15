import { logQuery, logsQuery } from '@/admin/queries/logs';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tools/logs')({
	loader: async ({ context: { queryClient } }) => {
		const list = await queryClient.ensureQueryData(logsQuery()).catch(() => undefined);

		if (list?.logs?.length) {
			await Promise.all(
				list.logs.map((file) =>
					queryClient.ensureQueryData(logQuery(file.id)).catch(() => undefined),
				),
			);
		}
	},
	component: lazyRouteComponent(() => import('@/admin/pages/tools/Logs')),
});
