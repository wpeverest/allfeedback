import NotFound from '@/admin/pages/NotFound';
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

const RootNotFound = () => (
	<div
		className="flex items-center justify-center bg-background"
		style={{ height: 'calc(100vh - var(--wp-admin--admin-bar--height, 32px))' }}
	>
		<NotFound
			title="Page not found"
			description="The page you're looking for doesn't exist or has been moved."
			showFormsLink={ false }
		/>
	</div>
);

export const Route = createRootRouteWithContext<RouterContext>()({
	component:         RootComponent,
	notFoundComponent: RootNotFound,
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
