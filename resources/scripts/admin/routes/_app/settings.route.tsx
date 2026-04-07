/**
 * routes/_app/settings.route.tsx — Settings parent route
 *
 * File-based route: /_app/settings
 * Renders the Settings layout (sidebar + <Outlet />) and pre-fetches
 * the settings data so child routes don't need to fetch individually.
 */

import Settings from '@/admin/pages/settings/Settings';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings')({
	component: Settings,
});
