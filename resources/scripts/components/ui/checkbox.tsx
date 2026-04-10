import { cn } from '@/lib/utils';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { Check, Minus } from 'lucide-react';

interface CheckboxProps {
	checked:         boolean | 'indeterminate';
	onCheckedChange: (checked: boolean) => void;
	disabled?:       boolean;
	className?:      string;
}

export const Checkbox = ({ checked, onCheckedChange, disabled, className }: CheckboxProps) => (
	<CheckboxPrimitive.Root
		checked={checked}
		onCheckedChange={(v) => onCheckedChange(v === true)}
		disabled={disabled}
		style={{
			border: (checked === true || checked === 'indeterminate')
				? '1.5px solid var(--primary)'
				: '1.5px solid #C4C4CF',
			backgroundColor: (checked === true || checked === 'indeterminate')
				? 'var(--primary)'
				: '#fff',
		}}
		className={cn(
			'peer flex size-[16px] shrink-0 items-center justify-center rounded-[4px]',
			'transition-colors duration-150',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1',
			'disabled:cursor-not-allowed disabled:opacity-50',
			className,
		)}
	>
		<CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
			{checked === 'indeterminate'
				? <Minus  className="size-3 stroke-[3]" />
				: <Check  className="size-3 stroke-[3]" />
			}
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
);
