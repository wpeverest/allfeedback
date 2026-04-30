import { cn } from '@/lib/utils';
import { Popover as PopoverPrimitive } from 'radix-ui';

export const Popover        = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor  = PopoverPrimitive.Anchor;

export const PopoverContent = ( {
	className,
	align      = 'center',
	sideOffset = 6,
	...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> ) => (
	<PopoverPrimitive.Portal>
		<PopoverPrimitive.Content
			align={ align }
			sideOffset={ sideOffset }
			className={ cn(
				'z-50 rounded-xl border border-border/50 bg-white p-0 outline-none',
				'shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.10)]',
				'data-[state=open]:animate-in data-[state=closed]:animate-out',
				'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
				'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
				'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
				'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
				className,
			) }
			{ ...props }
		/>
	</PopoverPrimitive.Portal>
);
