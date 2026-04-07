/**
 * routes/_app/settings.index.tsx — Settings index redirect
 *
 * File-based route: /_app/settings/
 * Redirects the bare /settings/ path to the General tab.
 */

import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings/')({
	beforeLoad: () => {
		throw redirect({ to: '/settings/general' });
	},
});
