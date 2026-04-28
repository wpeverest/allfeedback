import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import {
	Archive,
	Loader2,
	Mail,
	MailOpen,
	RotateCcw,
	Trash2,
	X,
} from 'lucide-react';
import { useRef } from 'react';

export interface BulkActionBarProps {
	count: number;
	showTrash?: boolean;
	showDelete?: boolean;
	showRestore?: boolean;
	showMarkRead?: boolean;
	showMarkUnread?: boolean;
	onDelete: () => void;
	onTrash: () => void;
	onRestore: () => void;
	onClone: () => void;
	onClear: () => void;
	onMarkRead?: () => void;
	onMarkUnread?: () => void;
	isDeleting?: boolean;
	isTrashing?: boolean;
	isRestoring?: boolean;
	isCloning?: boolean;
	isMarkingRead?: boolean;
	isMarkingUnread?: boolean;
}

export const BulkActionBar = ({
	count,
	showTrash = false,
	showDelete = false,
	showRestore = false,
	showMarkRead = false,
	showMarkUnread = false,
	onDelete,
	onTrash,
	onRestore,
	onClear,
	onMarkRead,
	onMarkUnread,
	isDeleting,
	isTrashing,
	isRestoring,
	isMarkingRead,
	isMarkingUnread,
}: BulkActionBarProps) => {
	const busy =
		isDeleting || isTrashing || isRestoring || isMarkingRead || isMarkingUnread;

	// Freeze both the count and the layout (show* props) at the last non-zero state so
	// neither the number nor the action buttons change while the bar is animating out.
	const frozenRef = useRef({
		count,
		showTrash,
		showDelete,
		showRestore,
		showMarkRead,
		showMarkUnread,
	});
	if (count > 0)
		frozenRef.current = {
			count,
			showTrash,
			showDelete,
			showRestore,
			showMarkRead,
			showMarkUnread,
		};
	const frozen = frozenRef.current;

	const hasActions =
		frozen.showTrash ||
		frozen.showDelete ||
		frozen.showRestore ||
		frozen.showMarkRead ||
		frozen.showMarkUnread;

	return (
		<div
			role="toolbar"
			aria-label={__('Bulk actions', 'allfeedback')}
			aria-hidden={count === 0}
			className={cn(
				'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-250 ease-out',
				count > 0
					? 'translate-y-0 opacity-100'
					: 'pointer-events-none translate-y-4 opacity-0',
			)}
		>
			<div className="border-border/80 flex items-center rounded-2xl border bg-white/95 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm">
				<div className="flex items-center gap-1 px-6 py-4">
					<span className="text-foreground/80 text-[13px] font-semibold tabular-nums">
						{frozen.count}
					</span>
					<span className="text-foreground/40 text-[13px]">
						{__('selected', 'allfeedback')}
					</span>
				</div>

				{hasActions && <div className="bg-border/60 h-5 w-px shrink-0" />}

				{frozen.showMarkRead && (
					<>
						<div className="px-3 py-3">
							<button
								type="button"
								onClick={onMarkRead}
								disabled={busy}
								className="border-primary/30 bg-primary/[0.06] text-primary/80 hover:border-primary/50 hover:bg-primary/[0.10] hover:text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-60"
							>
								{isMarkingRead ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<MailOpen className="size-3.5" />
								)}
								{__('Mark as read', 'allfeedback')}
							</button>
						</div>
						{(frozen.showMarkUnread ||
							frozen.showRestore ||
							frozen.showTrash ||
							frozen.showDelete) && (
							<div className="bg-border/60 h-5 w-px shrink-0" />
						)}
					</>
				)}

				{frozen.showMarkUnread && (
					<>
						<div className="px-3 py-3">
							<button
								type="button"
								onClick={onMarkUnread}
								disabled={busy}
								className="border-border/80 bg-muted/40 text-foreground/60 hover:border-border hover:bg-muted/70 hover:text-foreground flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-60"
							>
								{isMarkingUnread ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<Mail className="size-3.5" />
								)}
								{__('Mark as unread', 'allfeedback')}
							</button>
						</div>
						{(frozen.showRestore || frozen.showTrash || frozen.showDelete) && (
							<div className="bg-border/60 h-5 w-px shrink-0" />
						)}
					</>
				)}

				{frozen.showRestore && (
					<>
						<div className="px-3 py-3">
							<button
								type="button"
								onClick={onRestore}
								disabled={busy}
								className="border-success/40 bg-success-subtle text-success hover:border-success/70 hover:bg-success-subtle/80 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-60"
							>
								{isRestoring ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<RotateCcw className="size-3.5" />
								)}
								{__('Restore', 'allfeedback')}
							</button>
						</div>
						{(frozen.showTrash || frozen.showDelete) && (
							<div className="bg-border/60 h-5 w-px shrink-0" />
						)}
					</>
				)}

				{frozen.showTrash && (
					<>
						<div className="px-3 py-3">
							<button
								type="button"
								onClick={onTrash}
								disabled={busy}
								className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-50/60 px-3 py-1.5 text-[13px] font-medium text-amber-600/80 transition-colors hover:border-amber-400/70 hover:bg-amber-50 hover:text-amber-700 disabled:pointer-events-none disabled:opacity-60"
							>
								{isTrashing ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<Archive className="size-3.5" />
								)}
								{__('Trash', 'allfeedback')}
							</button>
						</div>
						{frozen.showDelete && (
							<div className="bg-border/60 h-5 w-px shrink-0" />
						)}
					</>
				)}

				{frozen.showDelete && (
					<div className="px-3 py-3">
						<button
							type="button"
							onClick={onDelete}
							disabled={busy}
							className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/[0.06] flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-60"
						>
							{isDeleting ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								<Trash2 className="size-3.5" />
							)}
							{__('Delete', 'allfeedback')}
						</button>
					</div>
				)}

				<div className="bg-border/60 h-5 w-px shrink-0" />

				<button
					type="button"
					onClick={onClear}
					disabled={busy}
					className="text-muted-foreground/50 hover:bg-muted/50 hover:text-foreground flex size-12 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-60"
					aria-label={__('Clear selection', 'allfeedback')}
				>
					<X className="size-3.5" />
				</button>
			</div>
		</div>
	);
};
