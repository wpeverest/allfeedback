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

export const router = createRouter();

document.addEventListener('DOMContentLoaded', () => {

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
					<Toaster closeButton position="bottom-center" />
					<ReactQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
			</ErrorBoundary>
		</StrictMode>,
	);
});
