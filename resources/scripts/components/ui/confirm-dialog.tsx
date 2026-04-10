import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
	open:          boolean;
	onOpenChange:  (open: boolean) => void;
	onConfirm:     () => void;
	title:         string;
	description:   string;
	confirmLabel?: string;
	cancelLabel?:  string;
	isPending?:    boolean;
}

export const ConfirmDialog = ({
	open,
	onOpenChange,
	onConfirm,
	title,
	description,
	confirmLabel = 'Delete',
	cancelLabel  = 'Cancel',
	isPending    = false,
}: ConfirmDialogProps) => (
	<Dialog.Root open={open} onOpenChange={(v) => { if (!isPending) onOpenChange(v); }}>
		<Dialog.Portal>
			{/* Backdrop */}
			<Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

			{/* Panel */}
			<Dialog.Content
				className={cn(
					'fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2',
					'rounded-2xl border border-border bg-card px-6 pb-6 pt-7',
					'shadow-[var(--shadow-dropdown)]',
					'focus:outline-none',
					'data-[state=open]:animate-in data-[state=closed]:animate-out',
					'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
					'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
					'duration-200',
				)}
			>
				{/* Icon badge */}
				<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
					<Trash2 className="size-5 text-destructive" />
				</div>

				{/* Text */}
				<div className="text-center">
					<Dialog.Title className="text-[15px] font-semibold text-foreground">
						{title}
					</Dialog.Title>
					<Dialog.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
						{description}
					</Dialog.Description>
				</div>

				{/* Divider */}
				<div className="my-5 h-px bg-border" />

				{/* Actions */}
				<div className="flex gap-2">
					<Dialog.Close asChild>
						<Button
							variant="outline"
							className="flex-1"
							disabled={isPending}
						>
							{cancelLabel}
						</Button>
					</Dialog.Close>
					<Button
						variant="danger"
						className="flex-1"
						disabled={isPending}
						onClick={onConfirm}
					>
						{isPending
							? <Loader2 className="size-3.5 animate-spin" />
							: <Trash2 className="size-3.5" />
						}
						{confirmLabel}
					</Button>
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
);
