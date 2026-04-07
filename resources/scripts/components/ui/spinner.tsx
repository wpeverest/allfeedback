/**
 * components/ui/spinner.tsx — Animated loading spinner
 */

import { cn } from '@/lib/utils';

interface SpinnerProps {
	className?: string;
	size?: 'sm' | 'md' | 'lg';
}

const sizes = {
	sm: 'size-4 border-2',
	md: 'size-6 border-2',
	lg: 'size-8 border-4',
};

export function Spinner({ className, size = 'md' }: SpinnerProps) {
	return (
		<span
			role="status"
			aria-label="Loading"
			className={cn(
				'inline-block animate-spin rounded-full border-current border-t-transparent',
				sizes[size],
				className,
			)}
		/>
	);
}
