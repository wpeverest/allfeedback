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
		className={cn(
			'group relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
			'transition-colors duration-200 ease-in-out',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
			'disabled:cursor-not-allowed disabled:opacity-40',
			checked ? 'bg-primary' : 'bg-foreground/[0.14]',
			className,
		)}
	>
		<SwitchPrimitive.Thumb
			className={cn(
				'pointer-events-none block size-[16px] rounded-full bg-white ring-0',
				'shadow-[0_1px_3px_rgba(0,0,0,0.20),0_1px_1px_rgba(0,0,0,0.10)]',
				'transition-transform duration-200 ease-in-out',
				checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
			)}
		/>
	</SwitchPrimitive.Root>
);
