/**
 * routes/index.tsx — Root redirect
 *
 * Immediately redirects "/" to "/dashboard" so the SPA always lands
 * on a meaningful page.
 */

import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	beforeLoad: () => {
		throw redirect({ to: '/dashboard' });
	},
});
