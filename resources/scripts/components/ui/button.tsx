/**
 * components/ui/button.tsx — AllFeedback Button component
 *
 * Variants: default | secondary | ghost | outline | danger | link
 * Sizes:    sm | default | lg | icon
 */

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const buttonVariants = cva(
	[
		'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
		'transition-all duration-150',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		'disabled:pointer-events-none disabled:opacity-50',
		'[&_svg]:pointer-events-none [&_svg]:shrink-0',
	],
	{
		variants: {
			variant: {
				/* ── Primary — filled indigo ─────────────────────────── */
				default:
					'bg-primary text-primary-foreground shadow-sm hover:bg-brand-600 active:bg-brand-700',
				/* ── Secondary — subtle brand tint ───────────────────── */
				secondary:
					'bg-secondary text-secondary-foreground hover:bg-brand-100 active:bg-brand-200',
				/* ── Ghost — no background ───────────────────────────── */
				ghost:
					'text-foreground hover:bg-muted hover:text-foreground active:bg-border',
				/* ── Outline — border only ───────────────────────────── */
				outline:
					'border border-input bg-transparent text-foreground shadow-sm hover:bg-muted active:bg-border',
				/* ── Danger — destructive red ────────────────────────── */
				danger:
					'bg-destructive text-destructive-foreground shadow-sm hover:opacity-90 active:opacity-80',
				/* ── Link — text-only ────────────────────────────────── */
				link:
					'text-primary underline-offset-4 hover:underline p-0 h-auto',
			},
			size: {
				sm:      'h-8 rounded-md px-3 text-xs gap-1.5 [&_svg]:size-3.5',
				default: 'h-9 px-4 text-sm [&_svg]:size-4',
				lg:      'h-10 rounded-md px-6 text-sm [&_svg]:size-4',
				icon:    'h-9 w-9 [&_svg]:size-4',
				'icon-sm': 'h-7 w-7 rounded-md [&_svg]:size-3.5',
			},
		},
		defaultVariants: {
			variant: 'default',
			size:    'default',
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, ...props }, ref) => {
		return (
			<button
				ref={ref}
				className={cn(buttonVariants({ variant, size, className }))}
				{...props}
			/>
		);
	},
);
Button.displayName = 'Button';

export { Button, buttonVariants };
