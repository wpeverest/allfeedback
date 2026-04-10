import { keepPreviousData, Query, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const onError = (error: Error, query: Query) => {
	if (query.meta?.suppressToast) return;
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

			placeholderData:      keepPreviousData,
		},
		mutations: {
			onError,
		},
	},
	queryCache,
});
