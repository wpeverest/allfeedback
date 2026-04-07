/**
 * components/ui/tabs.tsx — Tab navigation component
 *
 * Lightweight, accessible tabs with keyboard support.
 * Uses React state (no Radix dependency) for simplicity.
 *
 * Usage:
 *   <Tabs defaultValue="general">
 *     <TabsList>
 *       <TabsTrigger value="general">General</TabsTrigger>
 *       <TabsTrigger value="advanced">Advanced</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="general">…</TabsContent>
 *     <TabsContent value="advanced">…</TabsContent>
 *   </Tabs>
 */

import { cn } from '@/lib/utils';
import * as React from 'react';

/* ── Context ─────────────────────────────────────────────────────────────── */

interface TabsContextValue {
	value: string;
	onChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
	const ctx = React.useContext(TabsContext);
	if (!ctx) throw new Error('<TabsTrigger> / <TabsContent> must be inside <Tabs>');
	return ctx;
}

/* ── Tabs root ───────────────────────────────────────────────────────────── */

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
	value?:         string;
	defaultValue?:  string;
	onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
	({ value: controlledValue, defaultValue = '', onValueChange, className, ...props }, ref) => {
		const [internalValue, setInternalValue] = React.useState(defaultValue);
		const isControlled = controlledValue !== undefined;
		const current = isControlled ? controlledValue : internalValue;

		const onChange = React.useCallback(
			(next: string) => {
				if (!isControlled) setInternalValue(next);
				onValueChange?.(next);
			},
			[isControlled, onValueChange],
		);

		return (
			<TabsContext.Provider value={{ value: current, onChange }}>
				<div ref={ref} className={cn('flex flex-col gap-0', className)} {...props} />
			</TabsContext.Provider>
		);
	},
);
Tabs.displayName = 'Tabs';

/* ── TabsList ────────────────────────────────────────────────────────────── */

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			role="tablist"
			className={cn(
				'flex items-center gap-1 rounded-lg bg-muted p-1',
				className,
			)}
			{...props}
		/>
	),
);
TabsList.displayName = 'TabsList';

/* ── TabsTrigger ─────────────────────────────────────────────────────────── */

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
	({ value, className, children, ...props }, ref) => {
		const ctx = useTabsContext();
		const isActive = ctx.value === value;

		return (
			<button
				ref={ref}
				type="button"
				role="tab"
				aria-selected={isActive}
				data-state={isActive ? 'active' : 'inactive'}
				onClick={() => ctx.onChange(value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						ctx.onChange(value);
					}
				}}
				className={cn(
					'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium',
					'ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
					'disabled:pointer-events-none disabled:opacity-50',
					isActive
						? 'bg-card text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground',
					className,
				)}
				{...props}
			>
				{children}
			</button>
		);
	},
);
TabsTrigger.displayName = 'TabsTrigger';

/* ── TabsContent ─────────────────────────────────────────────────────────── */

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
	value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
	({ value, className, ...props }, ref) => {
		const ctx = useTabsContext();
		if (ctx.value !== value) return null;

		return (
			<div
				ref={ref}
				role="tabpanel"
				data-state="active"
				className={cn(
					'mt-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
					className,
				)}
				{...props}
			/>
		);
	},
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
