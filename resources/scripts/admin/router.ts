/**
 * admin/router.ts — TanStack Router configuration
 *
 * Uses hash history so the SPA works inside the WordPress admin
 * without server-side routing changes:
 *   /wp-admin/admin.php?page=all-feedback#/dashboard
 *   /wp-admin/admin.php?page=all-feedback#/settings
 *
 * The route tree is auto-generated from resources/scripts/admin/routes/
 * by the TanStack Router webpack plugin. Do NOT edit routeTree.gen.ts manually.
 */

import { queryClient } from '@/lib/query-client';
import {
	createHashHistory,
	createRouter as createTanStackRouter,
} from '@tanstack/react-router';
import { RouterErrorComponent } from './RouterErrorComponent';
import { routeTree } from './routeTree.gen';

const hashHistory = createHashHistory();

export function createRouter() {
	const router = createTanStackRouter({
		routeTree,
		history:                hashHistory,
		scrollRestoration:      true,
		defaultErrorComponent:  RouterErrorComponent,
		defaultPreload:         'intent',
		defaultPreloadStaleTime: 0,
		defaultStaleTime:       30_000,
		// Pass queryClient through router context so route loaders can call
		// context.queryClient.ensureQueryData(…).
		context: { queryClient },
	});

	// Notify the PHP-injected sidebar highlight script on every navigation so
	// the WP admin sidebar active class stays in sync with the hash route.
	router.subscribe('onResolved', () => {
		window.dispatchEvent(new Event('rmb:navigate'));
	});

	return router;
}

export type Router = ReturnType<typeof createRouter>;

// Augment the TanStack Router module so useRouter() is fully typed.
declare module '@tanstack/react-router' {
	interface Register {
		router: Router;
	}
}
