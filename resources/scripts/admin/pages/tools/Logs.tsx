import { logsApi } from '@/admin/api/logs';
import type { LogFile, LogFileDetail } from '@/admin/api/logs';
import { logQuery, logsQuery } from '@/admin/queries/logs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { ChevronDown, Download, RefreshCw, ScrollText, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';

// ── types ──────────────────────────────────────────────────────────────────

type LogLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

interface ParsedLine {
	lineNumber: number;
	raw:        string;
	level:      LogLevel | null;
}

// ── constants ──────────────────────────────────────────────────────────────

const ENTRY_RE = /^\[([^\]]+)\] \[([A-Z]+)\] (.+)$/;

// Soft cap before showing "Show all" — avoids rendering thousands of DOM nodes.
const RENDER_THRESHOLD = 1000;

const SKELETON_WIDTHS = ['w-3/4', 'w-11/12', 'w-2/3', 'w-4/5', 'w-1/2', 'w-3/5'];

// Per-level text color (Tailwind classes applied to each code row).
const LINE_TEXT: Record<string, string> = {
	FATAL:   'text-red-600',
	ERROR:   'text-red-500',
	WARNING: 'text-amber-600',
	INFO:    'text-blue-600',
	DEBUG:   'text-muted-foreground',
};

// Subtle background tint for high-severity lines.
const LINE_BG: Partial<Record<LogLevel, string>> = {
	FATAL:   'bg-red-500/[0.06]',
	ERROR:   'bg-red-500/[0.03]',
	WARNING: 'bg-amber-500/[0.04]',
};

const FILTERS: { key: LogLevel | 'ALL'; label: string }[] = [
	{ key: 'ALL',     label: __('All',     'all-feedback') },
	{ key: 'FATAL',   label: __('Fatal',   'all-feedback') },
	{ key: 'ERROR',   label: __('Error',   'all-feedback') },
	{ key: 'WARNING', label: __('Warning', 'all-feedback') },
	{ key: 'INFO',    label: __('Info',    'all-feedback') },
	{ key: 'DEBUG',   label: __('Debug',   'all-feedback') },
];

// ── helpers ────────────────────────────────────────────────────────────────

function parseLines(content: string): ParsedLine[] {
	return content
		.split('\n')
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
	const url  = URL.createObjectURL(blob);
	const a    = document.createElement('a');
	a.href     = url;
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
	label:   string;
	count:   number;
	active:  boolean;
	onClick: () => void;
}) => (
	<button
		type="button"
		onClick={onClick}
		className={cn(
			'flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[12.5px] font-medium transition-colors',
			active
				? 'border-primary bg-primary/10 text-primary'
				: 'border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground',
		)}
	>
		{label}
		<span className={cn('text-[11px] font-semibold', active ? 'text-primary' : 'text-muted-foreground/60')}>
			{count}
		</span>
	</button>
);

// ── code viewer ────────────────────────────────────────────────────────────

const LogCodeViewer = ({
	lines,
	activeFilter,
}: {
	lines:        ParsedLine[];
	activeFilter: LogLevel | 'ALL';
}) => {
	const [showAll, setShowAll] = useState(false);

	const filtered = activeFilter === 'ALL'
		? lines
		: lines.filter((l) => l.level === activeFilter);

	const truncated = !showAll && filtered.length > RENDER_THRESHOLD;
	const visible   = truncated ? filtered.slice(0, RENDER_THRESHOLD) : filtered;

	if (filtered.length === 0) {
		return (
			<div className="bg-muted/40 px-6 py-8 text-center font-mono text-[12px] text-muted-foreground/50">
				{activeFilter === 'ALL'
					? __('No entries in this file.', 'all-feedback')
					: `${__('No', 'all-feedback')} ${activeFilter} ${__('entries in this file.', 'all-feedback')}`}
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			{/* Scrollable code table */}
			<div className="max-h-[520px] overflow-auto bg-muted/40">
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
								<td className="sticky left-0 z-10 w-[3.5rem] min-w-[3.5rem] select-none border-r border-border/50 bg-muted/60 py-1.5 pr-4 text-right align-top font-mono text-[11px] leading-5 text-muted-foreground/40 group-hover:text-muted-foreground/60">
									{line.lineNumber}
								</td>
								{/* Log line content */}
								<td
									className={cn(
										'whitespace-pre py-1.5 pl-5 pr-8 align-top font-mono text-[12px] leading-5',
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
				<div className="flex items-center justify-between border-t border-border/50 bg-muted/40 px-5 py-2.5">
					<span className="font-mono text-[11px] text-muted-foreground/50">
						{__('Showing', 'all-feedback')} {RENDER_THRESHOLD.toLocaleString()} {__('of', 'all-feedback')} {filtered.length.toLocaleString()} {__('lines', 'all-feedback')}
					</span>
					<button
						type="button"
						onClick={() => setShowAll(true)}
						className="font-mono text-[11px] text-primary transition-colors hover:text-primary/80"
					>
						{__('Show all', 'all-feedback')} {filtered.length.toLocaleString()} {__('lines', 'all-feedback')} →
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
					<div className="w-6 shrink-0 animate-pulse rounded-sm bg-muted-foreground/10 py-[6px]" />
					<div className={cn('h-[13px] animate-pulse rounded-sm bg-muted-foreground/10', w)} />
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
	file:         LogFile;
	activeFilter: LogLevel | 'ALL';
	onDelete:     () => void;
	isDeleting:   boolean;
	defaultOpen:  boolean;
}) => {
	const [open, setOpen] = useState(defaultOpen);

	const { data: detail, isFetching } = useQuery({
		...logQuery(file.id),
		enabled:   open,
		staleTime: 5 * 60 * 1000,
	});

	const lines = useMemo(
		() => (detail ? parseLines(detail.content) : []),
		[detail],
	);

	const handleDownload = () => {
		if (detail) { triggerDownload(file.name, detail.content); return; }
		logsApi.get(file.id)
			.then((d: LogFileDetail) => triggerDownload(file.name, d.content))
			.catch(() => toast.error(__('Failed to download log file.', 'all-feedback')));
	};

	return (
		<div className={cn('overflow-hidden rounded-lg border border-border/50 transition-opacity', isDeleting && 'opacity-50')}>
			{/* accordion header */}
			<div
				className="flex cursor-pointer items-center gap-3 px-4 py-3 select-none transition-colors hover:bg-muted/40"
				onClick={() => setOpen((o) => !o)}
			>
				<ChevronDown
					className={cn(
						'size-[14px] shrink-0 text-muted-foreground/50 transition-transform duration-200',
						!open && '-rotate-90',
					)}
				/>
				<span className="flex-1 font-mono text-[12.5px] font-medium text-foreground/80">
					{file.name}
				</span>
				<span className="text-[12px] text-muted-foreground/50">
					{file.entries} {__('entries', 'all-feedback')} · {file.size}
				</span>

				<div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
					<button
						type="button"
						title={__('Download', 'all-feedback')}
						onClick={handleDownload}
						className="flex size-7 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
					>
						<Download className="size-3.5" />
					</button>
					<button
						type="button"
						title={__('Delete', 'all-feedback')}
						disabled={isDeleting}
						onClick={onDelete}
						className="flex size-7 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
					>
						<Trash2 className="size-3.5" />
					</button>
				</div>
			</div>

			{/* code viewer */}
			{open && (
				<div className="border-t border-border/50">
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
		<div className="flex size-12 items-center justify-center rounded-xl bg-muted/60">
			<ScrollText className="size-5 text-muted-foreground/40" />
		</div>
		<p className="mt-1 text-[13.5px] font-medium text-foreground/70">
			{__('No logs yet', 'all-feedback')}
		</p>
		<p className="max-w-xs text-[12.5px] text-muted-foreground/55">
			{__('Logs will appear here once logging is enabled in ', 'all-feedback')}
			<Link
				to="/settings/advanced"
				className="font-medium !text-primary underline underline-offset-2 hover:!opacity-80"
			>
				{__('Settings → Advanced', 'all-feedback')}
			</Link>
			{'.'}
		</p>
	</div>
);

// ── main component ─────────────────────────────────────────────────────────

const Logs = () => {
	const queryClient = useQueryClient();

	const [activeFilter, setActiveFilter]     = useState<LogLevel | 'ALL'>('ALL');
	const [deletingFiles, setDeletingFiles]   = useState<Set<string>>(new Set());
	const [isDeletingAll, setIsDeletingAll]   = useState(false);
	const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
	const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const { data: listData, isPending: isListPending } = useQuery({
		...logsQuery(),
		staleTime: 30 * 1000,
	});

	const files = listData?.logs ?? [];

	const fileDetailQueries = useQueries({
		queries: files.map((file) => ({
			...logQuery(file.id),
			staleTime: 5 * 60 * 1000,
			enabled:   files.length > 0,
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
			confirmTimerRef.current = setTimeout(() => setConfirmDeleteAll(false), 3000);
			return;
		}
		if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
		setConfirmDeleteAll(false);
		setIsDeletingAll(true);

		logsApi.bulkDelete(files.map((f) => f.id))
			.then(() => {
				queryClient.setQueryData(logsQuery().queryKey, (old: typeof listData) => {
					if (!old) return old;
					return { ...old, logs: [], total: 0 };
				});
				files.forEach((f) => queryClient.removeQueries({ queryKey: logQuery(f.id).queryKey }));
				toast.success(__('All log files deleted.', 'all-feedback'));
			})
			.catch(() => toast.error(__('Failed to delete all log files.', 'all-feedback')))
			.finally(() => setIsDeletingAll(false));
	};

	const handleDeleteFile = (file: LogFile) => {
		setDeletingFiles((prev) => new Set(prev).add(file.id));

		logsApi.delete(file.id)
			.then(() => {
				queryClient.setQueryData(logsQuery().queryKey, (old: typeof listData) => {
					if (!old) return old;
					return { ...old, logs: old.logs.filter((f) => f.id !== file.id), total: old.total - 1 };
				});
				queryClient.removeQueries({ queryKey: logQuery(file.id).queryKey });
				toast.success(__('Log file deleted.', 'all-feedback'));
			})
			.catch(() => toast.error(__('Failed to delete log file.', 'all-feedback')))
			.finally(() => {
				setDeletingFiles((prev) => { const n = new Set(prev); n.delete(file.id); return n; });
			});
	};

	return (
		<div>
			{/* card header */}
			<div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
				<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
					<ScrollText className="size-[18px] text-primary" />
				</div>
				<div>
					<h3 className="text-[16px] font-semibold text-foreground" style={{ margin: 0 }}>
						{__('Activity Logs', 'all-feedback')}
					</h3>
					<p className="text-[12px] text-muted-foreground/60" style={{ margin: 0 }}>
						{files.length} {__('files', 'all-feedback')}
						{files.length > 0 && <> · {formatBytes(totalBytes)}</>}
					</p>
				</div>
				<div className="ml-auto flex items-center gap-2">
					{files.length > 0 && (
						<Button
							variant="outline"
							size="sm"
							disabled={isDeletingAll || isListPending}
							onClick={handleDeleteAll}
							className={cn(
								'border-destructive/60 text-destructive hover:bg-destructive/10 hover:text-destructive',
								confirmDeleteAll && 'bg-destructive/10',
							)}
						>
							<Trash2 className="size-3.5" />
							{confirmDeleteAll ? __('Confirm delete all?', 'all-feedback') : __('Delete All', 'all-feedback')}
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						disabled={isListPending}
						onClick={() => queryClient.invalidateQueries({ queryKey: logsQuery().queryKey })}
					>
						<RefreshCw className={cn('size-3.5', isListPending && 'animate-spin')} />
						{__('Refresh', 'all-feedback')}
					</Button>
				</div>
			</div>

			{/* filter tabs */}
			{allLines.length > 0 && (
				<div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-6 py-3.5">
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
			<div className="px-6 pb-4 pt-4">
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
				<div className="border-t border-border/50 px-6 py-3 text-right">
					<span className="text-[12px] text-muted-foreground/55">
						{countFor(activeFilter).toLocaleString()} {__('lines', 'all-feedback')}
						{activeFilter !== 'ALL' && (
							<> · {allLines.length.toLocaleString()} {__('total', 'all-feedback')}</>
						)}
					</span>
				</div>
			)}
		</div>
	);
};

export default Logs;
