/**
 * routes/__root.tsx — Root route
 *
 * The root of the TanStack Router file-based route tree.
 * Provides the QueryClient through router context so route loaders can
 * pre-fetch data with context.queryClient.ensureQueryData(…).
 *
 * TanStackRouterDevtools is rendered here so it's always available.
 */

import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import type { QueryClient } from '@tanstack/react-query';
import * as React from 'react';

export interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});

function RootComponent() {
	return (
		<React.Fragment>
			<Outlet />
			<TanStackRouterDevtools />
		</React.Fragment>
	);
}
