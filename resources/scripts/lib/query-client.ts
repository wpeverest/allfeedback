import { keepPreviousData, QueryCache, QueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';
import { toast } from 'sonner';

const showErrorToast = (error: Error) => {
	toast.error(error?.message || 'Unknown error', {
		dismissible: true,
		duration:    5000,
		closeButton: true,
	});
};

export const queryCache = new QueryCache({
	onError: (error: Error, query: Query<unknown, unknown, unknown, readonly unknown[]>) => {
		if (query.meta?.suppressToast) return;
		showErrorToast(error);
	},
});

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry:                false,
			staleTime:            5_000,
			placeholderData:      keepPreviousData,
		},
		mutations: {
			onError: (error: Error) => showErrorToast(error),
		},
	},
	queryCache,
});
