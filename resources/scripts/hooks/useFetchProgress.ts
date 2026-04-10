import { useIsFetching } from '@tanstack/react-query';

export function useFetchProgress(): number {
	const fetching = useIsFetching();
	if (fetching === 0) return 0;

	return Math.min(90, fetching * 30);
}
