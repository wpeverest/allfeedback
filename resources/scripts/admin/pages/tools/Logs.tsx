import type { LogFile, LogFileDetail } from '@/admin/api/logs';
import { logsApi } from '@/admin/api/logs';
import { Tooltip } from '@/admin/components/Tooltip';
import { logQuery, logsQuery } from '@/admin/queries/logs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import {
	ChevronDown,
	Download,
	RefreshCw,
	ScrollText,
	Trash2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// ── types ──────────────────────────────────────────────────────────────────

type LogLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

interface ParsedLine {
	lineNumber: number;
	raw: string;
	level: LogLevel | null;
}

// ── constants ──────────────────────────────────────────────────────────────

const ENTRY_RE = /^\[([^\]]+)\] \[([A-Z]+)\] (.+)$/;

// Soft cap before showing "Show all" — avoids rendering thousands of DOM nodes.
const RENDER_THRESHOLD = 1000;

const SKELETON_WIDTHS = [
	'w-3/4',
	'w-11/12',
	'w-2/3',
	'w-4/5',
	'w-1/2',
	'w-3/5',
];

// Per-level text color (Tailwind classes applied to each code row).
const LINE_TEXT: Record<string, string> = {
	FATAL: 'text-red-600',
	ERROR: 'text-red-500',
	WARNING: 'text-amber-600',
	INFO: 'text-blue-600',
	DEBUG: 'text-muted-foreground',
};

// Subtle background tint for high-severity lines.
const LINE_BG: Partial<Record<LogLevel, string>> = {
	FATAL: 'bg-red-500/[0.06]',
	ERROR: 'bg-red-500/[0.03]',
	WARNING: 'bg-amber-500/[0.04]',
};

const FILTERS: { key: LogLevel | 'ALL'; label: string }[] = [
	{ key: 'ALL', label: __('All', 'allfeedback') },
	{ key: 'FATAL', label: __('Fatal', 'allfeedback') },
	{ key: 'ERROR', label: __('Error', 'allfeedback') },
	{ key: 'WARNING', label: __('Warning', 'allfeedback') },
	{ key: 'INFO', label: __('Info', 'allfeedback') },
	{ key: 'DEBUG', label: __('Debug', 'allfeedback') },
];

// ── helpers ────────────────────────────────────────────────────────────────

function parseLines(content: string): ParsedLine[] {
	return content
		.split(/\r?\n/)
		.filter((l) => l.trim())
		.map((raw, i) => {
			const m = raw.match(ENTRY_RE);
			return { lineNumber: i + 1, raw, level: m ? (m[2] as LogLevel) : null };
		});
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)} KB`;
	return `${(kb / 1024).toFixed(1)} MB`;
}

function triggerDownload(filename: string, content: string): void {
	const blob = new Blob([content], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

// ── filter tab ─────────────────────────────────────────────────────────────

const FilterTab = ({
	label,
	count,
	active,
	onClick,
}: {
	label: string;
	count: number;
	active: boolean;
	onClick: () => void;
}) => (
	<button
		type="button"
		onClick={onClick}
		className={cn(
			'flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-sm font-medium transition-colors',
			active
				? 'border-primary bg-primary/10 text-primary'
				: 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground bg-transparent',
		)}
	>
		{label}
		<span
			className={cn(
				'text-2xs font-semibold',
				active ? 'text-primary' : 'text-muted-foreground/60',
			)}
		>
			{count}
		</span>
	</button>
);

// ── code viewer ────────────────────────────────────────────────────────────

const LogCodeViewer = ({
	lines,
	activeFilter,
}: {
	lines: ParsedLine[];
	activeFilter: LogLevel | 'ALL';
}) => {
	const [showAll, setShowAll] = useState(false);

	const filtered =
		activeFilter === 'ALL'
			? lines
			: lines.filter((l) => l.level === activeFilter);

	const truncated = !showAll && filtered.length > RENDER_THRESHOLD;
	const visible = truncated ? filtered.slice(0, RENDER_THRESHOLD) : filtered;

	if (filtered.length === 0) {
		return (
			<div className="bg-muted/40 text-muted-foreground/50 px-6 py-8 text-center font-mono text-xs">
				{activeFilter === 'ALL'
					? __('No entries in this file.', 'allfeedback')
					: `${__('No', 'allfeedback')} ${activeFilter} ${__('entries in this file.', 'allfeedback')}`}
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			{/* Scrollable code table */}
			<div className="bg-muted/40 max-h-[520px] overflow-auto" style={{ scrollbarGutter: 'stable' }}>
				<table className="w-full min-w-full border-collapse">
					<tbody>
						{visible.map((line) => (
							<tr
								key={line.lineNumber}
								className={cn(
									'group hover:bg-foreground/[0.03]',
									line.level && LINE_BG[line.level],
								)}
							>
								{/* Gutter — sticky so it stays visible on horizontal scroll */}
								<td className="border-border/50 bg-muted/60 text-2xs text-muted-foreground/40 group-hover:text-muted-foreground/60 sticky left-0 z-10 w-[3.5rem] min-w-[3.5rem] border-r py-1.5 pr-4 text-right align-top font-mono leading-5 select-none">
									{line.lineNumber}
								</td>
								{/* Log line content */}
								<td
									className={cn(
										'py-1.5 pr-8 pl-5 align-top font-mono text-xs leading-5 whitespace-pre',
										line.level ? LINE_TEXT[line.level] : 'text-foreground/70',
									)}
								>
									{line.raw}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Show-all prompt when file exceeds render threshold */}
			{truncated && (
				<div className="border-border/50 bg-muted/40 flex items-center justify-between border-t px-5 py-2.5">
					<span className="text-2xs text-muted-foreground/50 font-mono">
						{__('Showing', 'allfeedback')} {RENDER_THRESHOLD.toLocaleString()}{' '}
						{__('of', 'allfeedback')} {filtered.length.toLocaleString()}{' '}
						{__('lines', 'allfeedback')}
					</span>
					<button
						type="button"
						onClick={() => setShowAll(true)}
						className="text-2xs text-primary hover:text-primary/80 font-mono transition-colors"
					>
						{__('Show all', 'allfeedback')} {filtered.length.toLocaleString()}{' '}
						{__('lines', 'allfeedback')} →
					</button>
				</div>
			)}
		</div>
	);
};

// ── loading skeleton ───────────────────────────────────────────────────────

const CodeViewerSkeleton = () => (
	<div className="bg-muted/40 px-5 py-4">
		<div className="space-y-2">
			{SKELETON_WIDTHS.map((w, i) => (
				<div key={i} className="flex items-center gap-4">
					<div className="bg-muted-foreground/10 w-6 shrink-0 animate-pulse rounded-sm py-[6px]" />
					<div
						className={cn(
							'bg-muted-foreground/10 h-[13px] animate-pulse rounded-sm',
							w,
						)}
					/>
				</div>
			))}
		</div>
	</div>
);

// ── log file accordion ─────────────────────────────────────────────────────

const LogFileSection = ({
	file,
	activeFilter,
	onDelete,
	isDeleting,
	defaultOpen,
}: {
	file: LogFile;
	activeFilter: LogLevel | 'ALL';
	onDelete: () => void;
	isDeleting: boolean;
	defaultOpen: boolean;
}) => {
	const [open, setOpen] = useState(defaultOpen);

	const { data: detail, isFetching } = useQuery({
		...logQuery(file.id),
		enabled: open,
		staleTime: 5 * 60 * 1000,
	});

	const lines = useMemo(
		() => (detail ? parseLines(detail.content) : []),
		[detail],
	);

	const handleDownload = () => {
		if (detail) {
			triggerDownload(file.name, detail.content);
			return;
		}
		logsApi
			.get(file.id)
			.then((d: LogFileDetail) => triggerDownload(file.name, d.content))
			.catch(() =>
				toast.error(__('Failed to download log file.', 'allfeedback')),
			);
	};

	return (
		<div
			className={cn(
				'border-border/50 overflow-hidden rounded-lg border transition-opacity',
				isDeleting && 'opacity-50',
			)}
		>
			{/* accordion header */}
			<div
				className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors select-none"
				onClick={() => setOpen((o) => !o)}
			>
				<ChevronDown
					className={cn(
						'text-muted-foreground/50 size-[14px] shrink-0 transition-transform duration-200',
						!open && '-rotate-90',
					)}
				/>
				<span className="text-foreground/80 flex-1 font-mono text-sm font-medium">
					{file.name}
				</span>
				<span className="text-muted-foreground/60 text-sm">
					{file.entries} {__('entries', 'allfeedback')} · {file.size}
				</span>

				<div
					className="flex items-center gap-1"
					onClick={(e) => e.stopPropagation()}
				>
					<Tooltip content={__('Download', 'allfeedback')}>
						<button
							type="button"
							onClick={handleDownload}
							className="text-muted-foreground/50 hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
						>
							<Download className="size-3.5" />
						</button>
					</Tooltip>
					<Tooltip content={__('Delete', 'allfeedback')}>
						<button
							type="button"
							disabled={isDeleting}
							onClick={onDelete}
							className="text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive flex size-7 items-center justify-center rounded-md transition-colors"
						>
							<Trash2 className="size-3.5" />
						</button>
					</Tooltip>
				</div>
			</div>

			{/* code viewer */}
			{open && (
				<div className="border-border/50 border-t">
					{isFetching && !detail ? (
						<CodeViewerSkeleton />
					) : (
						<LogCodeViewer lines={lines} activeFilter={activeFilter} />
					)}
				</div>
			)}
		</div>
	);
};

// ── empty state ────────────────────────────────────────────────────────────

const EmptyState = () => (
	<div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
		<div className="bg-muted/60 flex size-12 items-center justify-center rounded-xl">
			<ScrollText className="text-muted-foreground/40 size-5" />
		</div>
		<p className="text-foreground/70 mt-1 text-sm font-medium">
			{__('No logs yet', 'allfeedback')}
		</p>
		<p className="text-muted-foreground/80 max-w-xs text-sm">
			{__('Logs will appear here once logging is enabled in ', 'allfeedback')}
			<Link
				to="/settings/advanced"
				className="!text-primary font-medium underline underline-offset-2 hover:!opacity-80"
			>
				{__('Settings → Advanced', 'allfeedback')}
			</Link>
			{'.'}
		</p>
	</div>
);

// ── main component ─────────────────────────────────────────────────────────

const Logs = () => {
	const queryClient = useQueryClient();

	const [activeFilter, setActiveFilter] = useState<LogLevel | 'ALL'>('ALL');
	const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
	const [isDeletingAll, setIsDeletingAll] = useState(false);
	const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
	const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const { data: listData, isPending: isListPending, isFetching: isListFetching } = useQuery(logsQuery());

	const files = listData?.logs ?? [];

	const fileDetailQueries = useQueries({
		queries: files.map((file) => ({
			...logQuery(file.id),
			enabled: files.length > 0,
		})),
	});

	// Aggregate parsed lines from all loaded files for filter-tab counts.
	const allLines = useMemo<ParsedLine[]>(() => {
		return fileDetailQueries
			.filter((q) => q.data !== undefined)
			.flatMap((q) => parseLines(q.data!.content));
	}, [fileDetailQueries]);

	const countFor = (level: LogLevel | 'ALL') =>
		level === 'ALL'
			? allLines.length
			: allLines.filter((l) => l.level === level).length;

	const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);

	const handleDeleteAll = () => {
		if (!confirmDeleteAll) {
			setConfirmDeleteAll(true);
			confirmTimerRef.current = setTimeout(
				() => setConfirmDeleteAll(false),
				3000,
			);
			return;
		}
		if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
		setConfirmDeleteAll(false);
		setIsDeletingAll(true);

		logsApi
			.bulkDelete(files.map((f) => f.id))
			.then(() => {
				queryClient.setQueryData(
					logsQuery().queryKey,
					(old: typeof listData) => {
						if (!old) return old;
						return { ...old, logs: [], total: 0 };
					},
				);
				files.forEach((f) =>
					queryClient.removeQueries({ queryKey: logQuery(f.id).queryKey }),
				);
				toast.success(__('All log files deleted.', 'allfeedback'));
			})
			.catch(() =>
				toast.error(__('Failed to delete all log files.', 'allfeedback')),
			)
			.finally(() => setIsDeletingAll(false));
	};

	const handleDeleteFile = (file: LogFile) => {
		setDeletingFiles((prev) => new Set(prev).add(file.id));

		logsApi
			.delete(file.id)
			.then(() => {
				queryClient.setQueryData(
					logsQuery().queryKey,
					(old: typeof listData) => {
						if (!old) return old;
						return {
							...old,
							logs: old.logs.filter((f) => f.id !== file.id),
							total: old.total - 1,
						};
					},
				);
				queryClient.removeQueries({ queryKey: logQuery(file.id).queryKey });
				toast.success(__('Log file deleted.', 'allfeedback'));
			})
			.catch(() => toast.error(__('Failed to delete log file.', 'allfeedback')))
			.finally(() => {
				setDeletingFiles((prev) => {
					const n = new Set(prev);
					n.delete(file.id);
					return n;
				});
			});
	};

	return (
		<div>
			{/* card header */}
			<div className="border-border/50 flex items-center gap-3 border-b px-6 py-4">
				<div className="bg-primary/10 flex size-9 items-center justify-center rounded-xl">
					<ScrollText className="text-primary size-[18px]" />
				</div>
				<div>
					<h3
						className="text-md text-foreground font-semibold"
						style={{ margin: 0 }}
					>
						{__('Activity Logs', 'allfeedback')}
					</h3>
					<p className="text-muted-foreground/60 text-xs" style={{ margin: 0 }}>
						{files.length} {__('files', 'allfeedback')}
						{files.length > 0 && <> · {formatBytes(totalBytes)}</>}
					</p>
				</div>
				<div className="ml-auto flex items-center gap-2">
					<Button
						variant="secondary"
						size="sm"
						disabled={isDeletingAll || isListPending || files.length === 0}
						onClick={handleDeleteAll}
						style={{ border: '1.5px solid color-mix(in oklch, var(--destructive) 60%, transparent)' }}
						className={cn(
							'text-destructive hover:bg-destructive/10 hover:text-destructive',
							confirmDeleteAll && 'bg-destructive/10',
						)}
					>
						<Trash2 className="size-3.5" />
						{confirmDeleteAll
							? __('Confirm delete all?', 'allfeedback')
							: __('Delete All', 'allfeedback')}
					</Button>
					<Button
						variant="secondary"
						size="sm"
						disabled={isListFetching}
						onClick={() =>
							queryClient.invalidateQueries({ queryKey: ['logs'] })
						}
						style={{ border: '1.5px solid color-mix(in oklch, var(--primary) 60%, transparent)' }}
					>
						<RefreshCw
							className={cn('size-3.5', isListFetching && 'animate-spin')}
						/>
						{__('Refresh', 'allfeedback')}
					</Button>
				</div>
			</div>

			{/* filter tabs */}
			{allLines.length > 0 && (
				<div className="border-border/50 flex flex-wrap items-center gap-2 border-b px-6 py-3.5">
					{FILTERS.map((f) => (
						<FilterTab
							key={f.key}
							label={f.label}
							count={countFor(f.key)}
							active={activeFilter === f.key}
							onClick={() => setActiveFilter(f.key)}
						/>
					))}
				</div>
			)}

			{/* file accordions */}
			<div className="px-6 pt-4 pb-4">
				{files.length === 0 ? (
					<EmptyState />
				) : (
					<div className="space-y-3">
						{files.map((file, i) => (
							<LogFileSection
								key={file.id}
								file={file}
								activeFilter={activeFilter}
								onDelete={() => handleDeleteFile(file)}
								isDeleting={deletingFiles.has(file.id)}
								defaultOpen={i === 0}
							/>
						))}
					</div>
				)}
			</div>

			{/* footer */}
			{allLines.length > 0 && (
				<div className="border-border/50 border-t px-6 py-3 text-right">
					<span className="text-muted-foreground/80 text-xs">
						{countFor(activeFilter).toLocaleString()}{' '}
						{__('lines', 'allfeedback')}
						{activeFilter !== 'ALL' && (
							<>
								{' '}
								· {allLines.length.toLocaleString()}{' '}
								{__('total', 'allfeedback')}
							</>
						)}
					</span>
				</div>
			)}
		</div>
	);
};

export default Logs;
