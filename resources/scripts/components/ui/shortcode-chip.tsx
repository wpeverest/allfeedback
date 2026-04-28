import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { Check, Code2, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ShortcodeChipProps {
	shortcode: string;
	size?: 'sm' | 'md';
	className?: string;
}

const ShortcodeChip = ({
	shortcode,
	size = 'sm',
	className,
}: ShortcodeChipProps) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		const onSuccess = () => {
			toast.success(__('Shortcode copied to clipboard.', 'allfeedback'));
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		};

		if (navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(shortcode).then(onSuccess);
		} else {
			const el = document.createElement('textarea');
			el.value = shortcode;
			Object.assign(el.style, {
				position: 'fixed',
				opacity: '0',
				top: '0',
				left: '0',
			});
			document.body.appendChild(el);
			el.focus();
			el.select();
			try {
				document.execCommand('copy');
				onSuccess();
			} catch {
				toast.error(__('Failed to copy to clipboard.', 'allfeedback'));
			}
			document.body.removeChild(el);
		}
	};

	const iconCls = size === 'md' ? 'size-3.5' : 'size-3.5';

	return (
		<button
			type="button"
			onClick={handleCopy}
			title={__('Copy shortcode', 'allfeedback')}
			className={cn(
				'group border-border bg-muted/60 hover:border-border hover:bg-muted flex w-full cursor-pointer items-center gap-1.5 rounded-md border pr-2 pl-3 text-left transition-colors',
				size === 'sm' ? 'py-2' : 'py-2.5',
				className,
			)}
		>
			<Code2 className={cn(iconCls, 'text-muted-foreground/70 shrink-0')} />
			<span
				className={cn(
					'text-muted-foreground min-w-0 flex-1 truncate leading-none font-medium',
					size === 'md' ? 'text-[13px]' : 'text-[13px]',
				)}
			>
				{shortcode}
			</span>
			{copied ? (
				<Check
					className={cn(iconCls, 'shrink-0 stroke-[2.5] text-green-600')}
				/>
			) : (
				<Copy
					className={cn(iconCls, 'text-foreground/70 shrink-0 stroke-[2.5]')}
				/>
			)}
		</button>
	);
};

export default ShortcodeChip;
