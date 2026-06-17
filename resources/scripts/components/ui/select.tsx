import { cn } from '@/lib/utils';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import * as React from 'react';
import { useCallback, useRef, useState } from 'react';

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
				'data-[state=open]:border-primary',
				'disabled:cursor-not-allowed disabled:opacity-50',
				'data-[size=default]:h-10 data-[size=default]:text-[14px] data-[size=sm]:h-9 data-[size=sm]:text-sm',
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
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const rafRef = useRef<number | null>(null);
	// Set when the dropdown is dismissed by an outside pointer click, so we can
	// stop Radix from returning focus to the trigger — otherwise the trigger
	// stays focused (and primary-bordered) until a second click blurs it.
	const pointerOutsideRef = useRef(false);
	const [canScrollUp, setCanScrollUp] = useState(false);
	const [canScrollDown, setCanScrollDown] = useState(false);

	const checkScroll = useCallback((el: HTMLDivElement) => {
		setCanScrollUp(el.scrollTop > 1);
		setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
	}, []);

	const scrollAreaRef = useCallback((el: HTMLDivElement | null) => {
		scrollRef.current = el;
		if (!el) return;
		requestAnimationFrame(() => {
			el.scrollTop = 0;
			checkScroll(el);
		});
		el.addEventListener('scroll', () => checkScroll(el));
	}, [checkScroll]);

	const startScroll = (dir: 'up' | 'down') => {
		if (rafRef.current !== null) return;
		const step = () => {
			const el = scrollRef.current;
			if (!el) return;
			el.scrollTop += dir === 'down' ? 1.5 : -1.5;
			rafRef.current = requestAnimationFrame(step);
		};
		rafRef.current = requestAnimationFrame(step);
	};

	const stopScroll = () => {
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
	};

	return (
		<SelectPrimitive.Portal container={container}>
			<SelectPrimitive.Content
				data-slot="select-content"
				position={position}
				style={{ maxHeight: '260px' }}
				className={cn(
					'relative z-50 flex min-w-[8rem] flex-col overflow-hidden rounded-lg border border-border bg-white text-foreground shadow-lg',
					'data-[state=open]:animate-in data-[state=closed]:animate-out',
					'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
					'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
					'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
					position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
					className,
				)}
				{...props}
				onPointerDownOutside={(e) => {
					pointerOutsideRef.current = true;
					props.onPointerDownOutside?.(e);
				}}
				onCloseAutoFocus={(e) => {
					// Keep the trigger blurred after an outside-click dismissal so its
					// border returns to normal in a single click. Focus still returns
					// to the trigger for keyboard / Escape / selection closes.
					if (pointerOutsideRef.current) {
						e.preventDefault();
						pointerOutsideRef.current = false;
					}
					props.onCloseAutoFocus?.(e);
				}}
			>
				<div
					className={cn(
						'pointer-events-none absolute inset-x-0 top-0 z-10 flex h-7 items-center justify-center bg-white transition-opacity duration-150',
						canScrollUp ? 'pointer-events-auto opacity-100' : 'opacity-0',
					)}
					onPointerEnter={() => startScroll('up')}
					onPointerLeave={stopScroll}
				>
					<ChevronUpIcon className="size-4 text-muted-foreground" />
				</div>
				<div
					ref={scrollAreaRef}
					className="min-h-0 flex-1 overflow-y-auto"
					style={{ scrollbarWidth: 'none' }}
					onWheel={stopScroll}
				>
					<SelectPrimitive.Viewport
						className={cn(
							'p-1',
							position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
						)}
					>
						{children}
					</SelectPrimitive.Viewport>
				</div>
				<div
					className={cn(
						'pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-7 items-center justify-center bg-white transition-opacity duration-150',
						canScrollDown ? 'pointer-events-auto opacity-100' : 'opacity-0',
					)}
					onPointerEnter={() => startScroll('down')}
					onPointerLeave={stopScroll}
				>
					<ChevronDownIcon className="size-4 text-muted-foreground" />
				</div>
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

export {
	Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
	SelectSeparator, SelectTrigger, SelectValue,
};
