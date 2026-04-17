import { cn } from '@/lib/utils';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import * as React from 'react';

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
	className,
	size = 'default',
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & { size?: 'sm' | 'default' }) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			data-size={size}
			className={cn(
				'flex w-fit cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-lg border border-border/70 bg-white px-3 py-2 text-[14px] text-foreground shadow-none outline-none transition-colors',
				'data-[placeholder]:text-muted-foreground/40',
				'focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/10',
				'disabled:cursor-not-allowed disabled:opacity-50',
				'data-[size=default]:h-9 data-[size=default]:text-[14px] data-[size=sm]:h-8 data-[size=sm]:text-sm',
				'[&_svg]:pointer-events-none [&_svg]:shrink-0',
				"[&_svg:not([class*='size-'])]:size-4",
				'*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2',
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDownIcon className="size-4 text-muted-foreground opacity-70" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

function SelectContent({
	className,
	children,
	position = 'popper',
	container,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & { container?: HTMLElement | null }) {
	return (
		<SelectPrimitive.Portal container={container}>
			<SelectPrimitive.Content
				data-slot="select-content"
				position={position}
				className={cn(
					'relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-hidden rounded-lg border border-border bg-white text-foreground shadow-lg',
					'data-[state=open]:animate-in data-[state=closed]:animate-out',
					'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
					'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
					'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
					position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
					className,
				)}
				{...props}
			>
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					className={cn(
						'p-1',
						position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
					)}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return (
		<SelectPrimitive.Label
			data-slot="select-label"
			className={cn('px-2 py-1.5 text-xs text-muted-foreground', className)}
			{...props}
		/>
	);
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-2 pr-8 text-[14px] text-foreground outline-none',
				'hover:bg-accent focus:bg-accent',
				'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
				'[&_svg]:pointer-events-none [&_svg]:shrink-0',
				className,
			)}
			{...props}
		>
			<span className="absolute right-2 flex size-3.5 items-center justify-center">
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className="size-3.5 text-primary" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			className={cn('-mx-1 my-1 h-px bg-border', className)}
			{...props}
		/>
	);
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
	return (
		<SelectPrimitive.ScrollUpButton
			className={cn('flex cursor-default items-center justify-center py-1', className)}
			{...props}
		>
			<ChevronUpIcon className="size-4" />
		</SelectPrimitive.ScrollUpButton>
	);
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
	return (
		<SelectPrimitive.ScrollDownButton
			className={cn('flex cursor-default items-center justify-center py-1', className)}
			{...props}
		>
			<ChevronDownIcon className="size-4" />
		</SelectPrimitive.ScrollDownButton>
	);
}

export {
	Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
	SelectScrollDownButton, SelectScrollUpButton, SelectSeparator,
	SelectTrigger, SelectValue,
};
