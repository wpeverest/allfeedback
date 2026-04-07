import { cn } from '@/lib/utils';
import * as React from 'react';

interface EmptyStateProps {
	icon:        React.ComponentType<{ className?: string }>;
	title:       string;
	description?: string;
	action?:     React.ReactNode;
	className?:  string;
}

const EmptyState = ({ icon: Icon, title, description, action, className }: EmptyStateProps) => {
	return (
		<div className={cn('flex flex-col items-center justify-center py-20 text-center', className)}>
			<div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
				<Icon className="size-6 text-muted-foreground" />
			</div>
			<p className="text-sm font-semibold text-foreground">{title}</p>
			{description && (
				<p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{description}</p>
			)}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
};

export { EmptyState };
