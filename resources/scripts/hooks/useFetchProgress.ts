/**
 * hooks/useFetchProgress.ts
 *
 * Returns a 0–100 progress value that represents how many TanStack Query
 * fetches are currently in-flight. Used to drive the thin progress bar
 * at the top of the admin layout.
 *
 * 0   = nothing loading
 * 100 = all resolved (bar hides)
 */

import { useIsFetching } from '@tanstack/react-query';

export function useFetchProgress(): number {
	const fetching = useIsFetching();
	if (fetching === 0) return 0;
	// Simple heuristic: each in-flight request contributes ~30% up to 90%.
	return Math.min(90, fetching * 30);
}
