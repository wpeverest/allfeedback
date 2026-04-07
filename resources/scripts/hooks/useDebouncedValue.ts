/**
 * hooks/useDebouncedValue.ts
 *
 * Delays updating the returned value until after `delay` ms have elapsed
 * since the last change. Useful for search inputs — prevents a query
 * firing on every keystroke.
 *
 * @example
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch     = useDebouncedValue(search, 300);
 *   // Use debouncedSearch in your query key.
 */

import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
	const [debounced, setDebounced] = useState<T>(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);

	return debounced;
}
