import { cn } from '@/lib/utils';
import { Switch as SwitchPrimitive } from 'radix-ui';
import * as React from 'react';

function Switch({
	className,
	size = 'default',
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
	size?: 'sm' | 'default';
}) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			data-size={size}
			className={cn(
				'peer data-[state=unchecked]:bg-foreground/20 focus-visible:border-ring focus-visible:ring-ring/50 group/switch data-[state=checked]:bg-primary inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-4 data-[size=sm]:w-7',
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					'bg-background dark:data-[state=unchecked]:bg-foreground pointer-events-none block rounded-full ring-0 transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3.5 ltr:data-[state=checked]:translate-x-[19px] rtl:data-[state=checked]:-translate-x-[19px] data-[state=unchecked]:translate-x-[1px]',
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
