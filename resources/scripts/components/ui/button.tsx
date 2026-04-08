import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

const buttonVariants = cva(
	[
		"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[14px] font-medium cursor-pointer",
		"transition-all shrink-0",
		"disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
		"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		"outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
		"aria-invalid:border-destructive aria-invalid:ring-destructive/20",
	],
	{
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground hover:bg-brand-600 active:bg-brand-700',
				secondary:
					'bg-white border border-border text-primary hover:bg-primary/[0.04] active:bg-primary/[0.08]',
				ghost:
					'hover:bg-muted hover:text-foreground active:bg-border',
				outline:
					'border border-input bg-background text-foreground hover:bg-muted active:bg-border',
				danger:
					'bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-80 focus-visible:ring-destructive/20',
				link:
					'text-primary underline-offset-4 hover:underline',
			},
			size: {
				xs:        "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm:        'h-9 rounded-lg gap-1.5 px-4 py-2 text-[13px] has-[>svg]:px-3',
				default:   'h-10 px-5 py-2.5 has-[>svg]:px-4',
				lg:        'h-11 rounded-lg px-7 py-3 text-[15px] has-[>svg]:px-5',
				'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
				'icon-sm': 'size-8 rounded-lg',
				icon:      'size-9 rounded-lg',
				'icon-lg': 'size-10 rounded-lg',
			},
		},
		defaultVariants: {
			variant: 'default',
			size:    'default',
		},
	},
);

const Button = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<'button'> &
		VariantProps<typeof buttonVariants> & {
			asChild?: boolean;
		}
>(({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot.Root : 'button';

	return (
		<Comp
			ref={ref}
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
});

Button.displayName = 'Button';

export { Button, buttonVariants };
