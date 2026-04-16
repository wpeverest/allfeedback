import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CopyButtonProps {
	text: string;
	title?: string;
	successMessage?: string;
	className?: string;
	iconClassName?: string;
}

const CopyButton = ({
	text,
	title,
	successMessage,
	className,
	iconClassName = 'size-3.5',
}: CopyButtonProps) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		const onSuccess = () => {
			toast.success(successMessage ?? __('Copied to clipboard.', 'all-feedback'));
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		};

		if (navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(text).then(onSuccess);
		} else {
			const el = document.createElement('textarea');
			el.value = text;
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

	return (
		<button
			type="button"
			onClick={handleCopy}
			title={title ?? __('Copy', 'all-feedback')}
			className={cn(
				'flex shrink-0 items-center justify-center transition-colors',
				className,
			)}
		>
			{copied
				? <Check className={cn(iconClassName, 'text-green-500')} />
				: <Copy className={iconClassName} />
			}
		</button>
	);
};

export default CopyButton;
