import { cn } from '@/lib/utils';
import * as React from 'react';

interface EmptyStateProps {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}

const EmptyState = ({
	icon: Icon,
	title,
	description,
	action,
	className,
}: EmptyStateProps) => (
	<div
		className={cn(
			'flex flex-col items-center justify-center py-16 text-center',
			className,
		)}
	>
		<div className="border-border/60 bg-muted/50 mb-5 flex size-14 items-center justify-center rounded-2xl border shadow-sm">
			<Icon className="text-muted-foreground/55 size-6" />
		</div>
		<p className="text-foreground/90 !my-1 text-[15px] leading-snug font-semibold">
			{title}
		</p>
		{description && (
			<p className="text-muted-foreground !my-1 mt-2 max-w-[280px] text-sm leading-relaxed">
				{description}
			</p>
		)}
		{action && <div className="mt-6">{action}</div>}
	</div>
);

export { EmptyState };
