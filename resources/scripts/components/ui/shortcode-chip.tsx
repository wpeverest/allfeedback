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

const ShortcodeChip = ({ shortcode, size = 'sm', className }: ShortcodeChipProps) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		const onSuccess = () => {
			toast.success(__('Shortcode copied to clipboard.', 'all-feedback'));
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		};

		if (navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(shortcode).then(onSuccess);
		} else {
			const el = document.createElement('textarea');
			el.value = shortcode;
			Object.assign(el.style, { position: 'fixed', opacity: '0', top: '0', left: '0' });
			document.body.appendChild(el);
			el.focus();
			el.select();
			try {
				document.execCommand('copy');
				onSuccess();
			} catch {
				toast.error(__('Failed to copy to clipboard.', 'all-feedback'));
			}
			document.body.removeChild(el);
		}
	};

	const iconCls = size === 'md' ? 'size-3.5' : 'size-3';

	return (
		<button
			type="button"
			onClick={handleCopy}
			title={__('Copy shortcode', 'all-feedback')}
			className={cn(
				'group flex w-full cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted/60 py-1.5 pl-3 pr-2 text-left transition-colors hover:border-border hover:bg-muted',
				className,
			)}
		>
			<Code2 className={cn(iconCls, 'shrink-0 text-muted-foreground/70')} />
			<span className={cn('min-w-0 flex-1 truncate font-mono text-foreground/90', size === 'md' ? 'text-xs' : 'text-xs')}>
				{shortcode}
			</span>
			{copied
				? <Check className={cn(iconCls, 'shrink-0 text-green-500 stroke-[2.5]')} />
				: <Copy className={cn(iconCls, 'shrink-0 text-foreground/70 stroke-[2.5]')} />
			}
		</button>
	);
};

export default ShortcodeChip;
