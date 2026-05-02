import { cn } from '@/lib/utils';
import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, ...props }, ref) => {
		return (
			<textarea
				data-slot="textarea"
				className={cn(
					'bg-muted/60 text-foreground flex w-full resize-none rounded-lg !px-3 !py-1 text-[14px]',
					'border border-transparent',
					'placeholder:text-muted-foreground/50',
					'transition-colors',
					'focus:border-border focus:bg-white focus:ring-0 focus:outline-none',
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
