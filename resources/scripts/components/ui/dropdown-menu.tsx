import { cn } from '@/lib/utils';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

export const DropdownMenu       = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal  = DropdownMenuPrimitive.Portal;

export const DropdownMenuContent = ({
	className,
	sideOffset = 6,
	align = 'end',
	...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) => (
	<DropdownMenuPrimitive.Portal>
		<DropdownMenuPrimitive.Content
			sideOffset={sideOffset}
			align={align}
			className={cn(
				'z-50 min-w-[140px] overflow-hidden rounded-xl border border-border bg-white p-1',
				'shadow-[0_4px_16px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)]',
				'data-[state=open]:animate-in data-[state=closed]:animate-out',
				'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
				'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
				'duration-150',
				className,
			)}
			{...props}
		/>
	</DropdownMenuPrimitive.Portal>
);

export const DropdownMenuItem = ({
	className,
	destructive,
	...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }) => (
	<DropdownMenuPrimitive.Item
		className={cn(
			'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium outline-none transition-colors',
			destructive
				? 'text-destructive focus:bg-destructive/[0.06]'
				: 'text-foreground/80 focus:bg-muted/60 focus:text-foreground',
			'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className,
		)}
		{...props}
	/>
);
