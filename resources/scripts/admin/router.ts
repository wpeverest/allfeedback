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

		context: { queryClient },
	});

	router.subscribe('onResolved', () => {
		window.dispatchEvent(new Event('allfeedback:navigate'));
	});

	return router;
}

export type Router = ReturnType<typeof createRouter>;

declare module '@tanstack/react-router' {
	interface Register {
		router: Router;
	}
}
