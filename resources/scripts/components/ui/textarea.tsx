import { cn } from '@/lib/utils';
import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, ...props }, ref) => {
		return (
			<textarea
				data-slot="textarea"
				className={cn(
					'flex w-full resize-none rounded-lg bg-muted/60 px-3 py-2 text-[14px] text-foreground',
					'border border-transparent',
					'placeholder:text-muted-foreground/50',
					'transition-colors',
					'focus:border-border focus:bg-white focus:outline-none focus:ring-0',
					'disabled:cursor-not-allowed disabled:opacity-50',
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Textarea.displayName = 'Textarea';

export { Textarea };
