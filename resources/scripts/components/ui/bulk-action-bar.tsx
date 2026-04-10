import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { Archive, Loader2, RotateCcw, Trash2, X } from 'lucide-react';

export interface BulkActionBarProps {
	count:          number;
	showTrash?:     boolean;
	showDelete?:    boolean;
	showRestore?:   boolean;
	onDelete:       () => void;
	onTrash:        () => void;
	onRestore:      () => void;
	onClone:        () => void;
	onClear:        () => void;
	isDeleting?:    boolean;
	isTrashing?:    boolean;
	isRestoring?:   boolean;
	isCloning?:     boolean;
}

/**
 * Floating bulk-action bar — slides up from the bottom when items are selected.
 */
export const BulkActionBar = ({
	count,
	showTrash   = false,
	showDelete  = false,
	showRestore = false,
	onDelete, onTrash, onRestore, onClear,
	isDeleting, isTrashing, isRestoring,
}: BulkActionBarProps) => {
	const busy        = isDeleting || isTrashing || isRestoring;
	const hasActions  = showTrash || showDelete || showRestore;

	return (
		<div
			role="toolbar"
			aria-label={__('Bulk actions', 'all-feedback')}
			aria-hidden={count === 0}
			className={cn(
				'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-250 ease-out',
				count > 0 ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
			)}
		>
			<div className="flex items-center rounded-2xl border border-border/80 bg-white/95 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm">

				{/* Count */}
				<div className="flex items-center gap-1 px-6 py-4">
					<span className="text-[13px] font-semibold tabular-nums text-foreground/80">
						{count}
					</span>
					<span className="text-[13px] text-foreground/40">
						{__('selected', 'all-feedback')}
					</span>
				</div>

				{hasActions && <div className="h-5 w-px shrink-0 bg-border/60" />}

				{/* Restore button */}
				{showRestore && (
					<>
						<div className="px-3 py-3">
							<button
								type="button"
								onClick={onRestore}
								disabled={busy}
								className="flex items-center gap-1.5 rounded-lg border border-success/40 bg-success-subtle px-3 py-1.5 text-[13px] font-medium text-success transition-colors hover:border-success/70 hover:bg-success-subtle/80 disabled:pointer-events-none disabled:opacity-60"
							>
								{isRestoring
									? <Loader2 className="size-3.5 animate-spin" />
									: <RotateCcw className="size-3.5" />
								}
								{__('Restore', 'all-feedback')}
							</button>
						</div>
						{(showTrash || showDelete) && <div className="h-5 w-px shrink-0 bg-border/60" />}
					</>
				)}

				{/* Trash button */}
				{showTrash && (
					<>
						<div className="px-3 py-3">
							<button
								type="button"
								onClick={onTrash}
								disabled={busy}
								className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-50/60 px-3 py-1.5 text-[13px] font-medium text-amber-600/80 transition-colors hover:border-amber-400/70 hover:bg-amber-50 hover:text-amber-700 disabled:pointer-events-none disabled:opacity-60"
							>
								{isTrashing
									? <Loader2 className="size-3.5 animate-spin" />
									: <Archive className="size-3.5" />
								}
								{__('Trash', 'all-feedback')}
							</button>
						</div>
						{showDelete && <div className="h-5 w-px shrink-0 bg-border/60" />}
					</>
				)}

				{/* Delete button — only when all selected are trashed */}
				{showDelete && (
					<div className="px-3 py-3">
						<button
							type="button"
							onClick={onDelete}
							disabled={busy}
							className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-[13px] font-medium text-destructive transition-colors hover:border-destructive hover:bg-destructive/[0.06] disabled:pointer-events-none disabled:opacity-60"
						>
							{isDeleting
								? <Loader2 className="size-3.5 animate-spin" />
								: <Trash2 className="size-3.5" />
							}
							{__('Delete', 'all-feedback')}
						</button>
					</div>
				)}

				{/* Divider before clear */}
				<div className="h-5 w-px shrink-0 bg-border/60" />

				{/* Clear button */}
				<button
					type="button"
					onClick={onClear}
					disabled={busy}
					className="flex size-12 items-center justify-center text-muted-foreground/50 transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
					aria-label={__('Clear selection', 'all-feedback')}
				>
					<X className="size-3.5" />
				</button>
			</div>
		</div>
	);
};
