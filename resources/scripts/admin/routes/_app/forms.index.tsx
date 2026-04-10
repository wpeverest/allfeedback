import { surveysQuery } from '@/admin/queries/surveys';
import { createFileRoute, lazyRouteComponent } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/forms/')({
	loader: async ({ context: { queryClient } }) => {
		try {
			await queryClient.ensureQueryData(surveysQuery());
		} catch {

		}
	},
	component: lazyRouteComponent(() => import('@/admin/pages/forms/AllForms')),
});
