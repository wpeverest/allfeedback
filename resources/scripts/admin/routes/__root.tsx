import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import * as React from 'react';

export interface RouterContext {
	queryClient: QueryClient;
}

const TanStackRouterDevtools =
	process.env.NODE_ENV === 'production'
		? () => null
		: React.lazy(() =>
				import('@tanstack/react-router-devtools').then((m) => ({
					default: m.TanStackRouterDevtools,
				}))
		  );

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});

function RootComponent() {
	return (
		<React.Fragment>
			<Outlet />
			<React.Suspense>
				<TanStackRouterDevtools />
			</React.Suspense>
		</React.Fragment>
	);
}
