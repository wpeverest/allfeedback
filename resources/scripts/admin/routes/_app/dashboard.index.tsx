/**
 * routes/_app/dashboard.index.tsx — Dashboard route
 *
 * File-based route: /_app/dashboard/
 * Pre-fetches sample data via the loader before rendering the page.
 */

import Dashboard from '@/admin/pages/dashboard/Dashboard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/dashboard/')({
	component: Dashboard,
});
