import { Tooltip as RadixTooltip } from 'radix-ui';
import { type ReactNode } from 'react';

type Props = {
	content:    ReactNode;
	children:   ReactNode;
	side?:      'top' | 'right' | 'bottom' | 'left';
	sideOffset?: number;
};

export function Tooltip({ content, children, side = 'top', sideOffset = 6 }: Props) {
	return (
		<RadixTooltip.Root>
			<RadixTooltip.Trigger asChild>
				{children}
			</RadixTooltip.Trigger>
			<RadixTooltip.Portal>
				<RadixTooltip.Content
					side={side}
					sideOffset={sideOffset}
					className="z-50 max-w-[280px] rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg"
				>
					{content}
					<RadixTooltip.Arrow className="fill-border/60" />
				</RadixTooltip.Content>
			</RadixTooltip.Portal>
		</RadixTooltip.Root>
	);
}
