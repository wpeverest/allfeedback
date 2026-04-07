/**
 * components/ui/badge.tsx — Status badge / chip component
 *
 * Variants: default | secondary | success | warning | danger | outline | info
 */

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const badgeVariants = cva(
	'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
	{
		variants: {
			variant: {
				default:
					'bg-primary/10 text-primary border border-primary/20',
				secondary:
					'bg-muted text-muted-foreground border border-border',
				success:
					'bg-success-subtle text-success border border-success/20',
				warning:
					'bg-warning-subtle text-warning-foreground border border-warning/20',
				danger:
					'bg-destructive/10 text-destructive border border-destructive/20',
				info:
					'bg-info-subtle text-info border border-info/20',
				outline:
					'border border-border text-foreground bg-transparent',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant, ...props }, ref) => {
		return (
			<span
				ref={ref}
				className={cn(badgeVariants({ variant, className }))}
				{...props}
			/>
		);
	},
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
