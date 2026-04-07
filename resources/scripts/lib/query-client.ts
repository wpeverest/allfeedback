/**
 * lib/query-client.ts
 *
 * Shared TanStack Query client.
 * Errors surfaced from queries and mutations are automatically
 * displayed via Sonner toast notifications.
 */

import { keepPreviousData, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const onError = (error: Error) => {
	toast.error(error?.message || 'Unknown error', {
		dismissible: true,
		duration:    5000,
		closeButton: true,
	});
};

export const queryCache = new QueryCache({ onError });

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry:                false,
			// Keep previous data visible while new data loads (no flash).
			placeholderData:      keepPreviousData,
		},
		mutations: {
			onError,
		},
	},
	queryCache,
});
