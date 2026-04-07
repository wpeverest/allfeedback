/**
 * admin/index.tsx — Admin SPA entry point
 *
 * This file is the webpack entry for resources/build/admin.js.
 * It mounts the React 18 app into #ALLFB-Admin-Root which is rendered
 * by AdminServiceProvider::renderDashboardPage() (and other page callbacks).
 */

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import apiFetch from '@wordpress/api-fetch';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/admin.pcss';
import { createRouter } from './router';

// Create the router once — exported so devtools can access it.
export const router = createRouter();

document.addEventListener('DOMContentLoaded', () => {
	// Register the WP REST API nonce so every @wordpress/api-fetch call
	// includes the X-WP-Nonce header automatically.
	apiFetch.use(apiFetch.createNonceMiddleware(__ALLFB_ADMIN__.nonce));

	const rootElement = document.getElementById('ALLFB-Admin-Root');

	if (!rootElement) {
		console.warn('[RMB] Admin: Root element #ALLFB-Admin-Root not found.');
		return;
	}

	createRoot(rootElement).render(
		<StrictMode>
			<ErrorBoundary>
				<QueryClientProvider client={queryClient}>
					<RouterProvider router={router} />
					<Toaster />
					<ReactQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
			</ErrorBoundary>
		</StrictMode>,
	);
});
