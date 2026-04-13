import { cn } from '@/lib/utils';
import { Switch as SwitchPrimitive } from 'radix-ui';

interface SwitchProps {
	checked:         boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?:       boolean;
	id?:             string;
	className?:      string;
}

export const Switch = ({ checked, onCheckedChange, disabled, id, className }: SwitchProps) => (
	<SwitchPrimitive.Root
		id={id}
		checked={checked}
		onCheckedChange={onCheckedChange}
		disabled={disabled}
		style={{ backgroundColor: checked ? 'var(--primary)' : '#C4C4CF' }}
		className={cn(
			'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
			'transition-colors duration-200',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1',
			'disabled:cursor-not-allowed disabled:opacity-50',
			className,
		)}
	>
		<SwitchPrimitive.Thumb
			className={cn(
				'pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
				checked ? 'translate-x-4' : 'translate-x-0',
			)}
		/>
	</SwitchPrimitive.Root>
);
