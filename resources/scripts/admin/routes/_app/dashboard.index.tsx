/**
 * routes/_app/dashboard.index.tsx — Dashboard route
 *
 * File-based route: /_app/dashboard/
 * Pre-fetches sample data via the loader before rendering the page.
 */

import Dashboard from '@/admin/pages/dashboard/Dashboard';
import { sampleQuery } from '@/admin/queries/sample';
import { sanitizeSearchParams } from '@/lib/utils';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/dashboard/')({
	validateSearch: (search) => sanitizeSearchParams(search),

	loaderDeps: ({ search }) => search,

	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(
			sampleQuery({
				page:     deps.page,
				per_page: deps.per_page,
				search:   deps.search,
			}),
		),

	component: Dashboard,
});
