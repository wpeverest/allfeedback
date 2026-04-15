import { useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';

export function useFetchProgress(): number {
	const isFetching              = useIsFetching();
	const [progress, setProgress] = useState(0);
	const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);
	const activeRef               = useRef(false);

	useEffect(() => {
		if (isFetching > 0) {
			activeRef.current = true;

			// Jump to 10 % immediately so the bar is visible right away.
			setProgress((p) => (p < 10 ? 10 : p));

			// Crawl toward 85 % — slows down as it approaches the cap.
			intervalRef.current = setInterval(() => {
				setProgress((p) => Math.min(85, p + (85 - p) * 0.08 + 0.5));
			}, 100);

			return () => {
				clearInterval(intervalRef.current!);
				intervalRef.current = null;
			};
		}

		if (activeRef.current) {
			activeRef.current = false;
			// Snap to 100 % on completion, then reset to hide.
			setProgress(100);
			const t = setTimeout(() => setProgress(0), 400);
			return () => clearTimeout(t);
		}
	}, [isFetching]);

	return progress;
}
