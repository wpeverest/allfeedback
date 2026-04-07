import { cn } from '@/lib/utils';
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				type={type}
				data-slot="input"
				className={cn(
					'flex h-10 w-full rounded-lg bg-muted/60 px-3 py-1 text-[14px] text-foreground',
					'border border-transparent',
					'placeholder:text-muted-foreground',
					'transition-colors',
					'focus:border-border focus:bg-white focus:outline-none focus:ring-0',
					'disabled:cursor-not-allowed disabled:opacity-50',
					'file:border-0 file:bg-transparent file:text-sm file:font-medium',
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Input.displayName = 'Input';

export { Input };
