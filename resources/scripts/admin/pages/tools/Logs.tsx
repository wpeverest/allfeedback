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

type LogLevel = 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG' | 'FATAL';

interface ParsedEntry {
	level:     LogLevel;
	timestamp: string;
	message:   string;
}

// ── constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// Matches: [2026-04-13T10:30:00+00:00] [ERROR] Message …
const ENTRY_RE = /^\[([^\]]+)\] \[([A-Z]+)\] (.+)$/;

// ── helpers ────────────────────────────────────────────────────────────────

function parseEntries(content: string): ParsedEntry[] {
	return content
		.split('\n')
		.filter(Boolean)
		.reduce<ParsedEntry[]>((acc, line) => {
			const m = line.match(ENTRY_RE);
			if (m) acc.push({ timestamp: m[1]!, level: m[2] as LogLevel, message: m[3]! });
			return acc;
		}, []);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)} KB`;
	return `${(kb / 1024).toFixed(1)} MB`;
}

// ── level badge ────────────────────────────────────────────────────────────

const LEVEL_CLASSES: Record<string, string> = {
	ERROR:   'bg-destructive/10 text-destructive border-destructive/20',
	FATAL:   'bg-destructive/10 text-destructive border-destructive/20',
	WARNING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
	INFO:    'bg-primary/10 text-primary border-primary/20',
	DEBUG:   'bg-muted text-muted-foreground border-border/50',
};

const LevelBadge = ({ level }: { level: string }) => (
	<span
		className={cn(
			'rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
			LEVEL_CLASSES[level] ?? LEVEL_CLASSES['DEBUG'],
		)}
	>
		{level}
	</span>
);

// ── filter tabs ────────────────────────────────────────────────────────────

const FILTERS: { key: LogLevel | 'ALL'; label: string }[] = [
	{ key: 'ALL',     label: __('All',     'all-feedback') },
	{ key: 'ERROR',   label: __('Error',   'all-feedback') },
	{ key: 'WARNING', label: __('Warning', 'all-feedback') },
	{ key: 'INFO',    label: __('Info',    'all-feedback') },
	{ key: 'DEBUG',   label: __('Debug',   'all-feedback') },
];

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

// ── download helper ────────────────────────────────────────────────────────

function triggerDownload(filename: string, content: string): void {
	const blob = new Blob([content], { type: 'text/plain' });
	const url  = URL.createObjectURL(blob);
	const a    = document.createElement('a');
	a.href     = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

// ── log entry row ──────────────────────────────────────────────────────────

const LogEntryRow = ({ entry }: { entry: ParsedEntry }) => (
	<div className="rounded-lg border border-border/50 px-4 py-3">
		<div className="flex items-center gap-2.5">
			<LevelBadge level={entry.level} />
			<span className="text-[12px] text-muted-foreground/60">{entry.timestamp}</span>
		</div>
		<p className="mt-2 font-mono text-[12.5px] text-foreground/80">{entry.message}</p>
	</div>
);

// ── log file skeleton ──────────────────────────────────────────────────────

const LogEntriesSkeleton = () => (
	<div className="space-y-2 border-t border-border/50 p-3">
		{[...Array(3)].map((_, i) => (
			<div key={i} className="h-[60px] animate-pulse rounded-lg border border-border/50 bg-muted/30" />
		))}
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
	const [open, setOpen]       = useState(defaultOpen);
	const [showAll, setShowAll] = useState(false);

	// Lazy-load file content when section is first opened.
	const { data: detail, isFetching } = useQuery({
		...logQuery(file.id),
		enabled:   open,
		staleTime: 5 * 60 * 1000,
	});

	const allEntries = useMemo(
		() => (detail ? parseEntries(detail.content) : []),
		[detail],
	);

	const filtered = activeFilter === 'ALL'
		? allEntries
		: allEntries.filter((e) => e.level === activeFilter);

	const visible   = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
	const remaining = filtered.length - PAGE_SIZE;

	const handleDownload = () => {
		if (detail) {
			triggerDownload(file.name, detail.content);
			return;
		}
		// Content not yet loaded — fetch it on demand.
		logsApi.get(file.id)
			.then((d: LogFileDetail) => triggerDownload(file.name, d.content))
			.catch(() => toast.error(__('Failed to download log file.', 'all-feedback')));
	};

	return (
		<div className={cn('rounded-lg border border-border/50 transition-opacity', isDeleting && 'opacity-50')}>
			{/* accordion header */}
			<div
				className="flex cursor-pointer items-center gap-3 px-4 py-3 select-none"
				onClick={() => setOpen((o) => !o)}
			>
				<ChevronDown
					className={cn(
						'size-[14px] shrink-0 text-muted-foreground/50 transition-transform',
						!open && '-rotate-90',
					)}
				/>
				<span className="flex-1 font-mono text-[12.5px] font-medium text-foreground/80">
					{file.name}
				</span>
				<span className="text-[12px] text-muted-foreground/50">
					{file.entries} {__('entries', 'all-feedback')} · {file.size}
				</span>

				{/* download & delete — stop propagation so they don't toggle the accordion */}
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

			{/* entries */}
			{open && (
				isFetching && !detail ? (
					<LogEntriesSkeleton />
				) : (
					<div className="space-y-2 border-t border-border/50 p-3">
						{filtered.length === 0 ? (
							<p className="py-4 text-center text-[12.5px] text-muted-foreground/50">
								{activeFilter === 'ALL'
									? __('No entries in this log file.', 'all-feedback')
									: __('No entries match this filter.', 'all-feedback')}
							</p>
						) : (
							<>
								{visible.map((entry, i) => (
									<LogEntryRow key={i} entry={entry} />
								))}

								{!showAll && remaining > 0 && (
									<button
										type="button"
										onClick={() => setShowAll(true)}
										className="w-full rounded-lg border border-dashed border-border/60 py-2.5 text-[12.5px] text-muted-foreground/60 transition-colors hover:border-border hover:text-foreground"
									>
										{__('Show', 'all-feedback')} {remaining} {__('more entries', 'all-feedback')}
									</button>
								)}
							</>
						)}
					</div>
				)
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

	const [activeFilter, setActiveFilter]   = useState<LogLevel | 'ALL'>('ALL');
	const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());

	// Fetch paginated list of log file metadata.
	const { data: listData, isPending: isListPending } = useQuery({
		...logsQuery(),
		staleTime: 30 * 1000,
	});

	const files = listData?.logs ?? [];

	// Eagerly load content for all files so filter-tab counts are accurate.
	// staleTime prevents redundant fetches when the user navigates away and back.
	const fileDetailQueries = useQueries({
		queries: files.map((file) => ({
			...logQuery(file.id),
			staleTime: 5 * 60 * 1000,
			enabled:   files.length > 0,
		})),
	});

	// Aggregate all parsed entries from loaded file contents.
	const allEntries = useMemo<ParsedEntry[]>(() => {
		return fileDetailQueries
			.filter((q) => q.data !== undefined)
			.flatMap((q) => parseEntries(q.data!.content));
	}, [fileDetailQueries]);

	const countFor = (level: LogLevel | 'ALL') =>
		level === 'ALL'
			? allEntries.length
			: allEntries.filter((e) => e.level === level).length;

	const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);

	const [isDeletingAll, setIsDeletingAll]     = useState(false);
	const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
	const confirmTimerRef                         = useRef<ReturnType<typeof setTimeout> | null>(null);

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
			.catch(() => {
				toast.error(__('Failed to delete all log files.', 'all-feedback'));
			})
			.finally(() => setIsDeletingAll(false));
	};

	const handleDeleteFile = (file: LogFile) => {
		setDeletingFiles((prev) => new Set(prev).add(file.id));

		logsApi.delete(file.id)
			.then(() => {
				// Remove from list cache immediately.
				queryClient.setQueryData(logsQuery().queryKey, (old: typeof listData) => {
					if (!old) return old;
					return {
						...old,
						logs:  old.logs.filter((f) => f.id !== file.id),
						total: old.total - 1,
					};
				});
				// Drop the now-stale content cache entry.
				queryClient.removeQueries({ queryKey: logQuery(file.id).queryKey });
				toast.success(__('Log file deleted.', 'all-feedback'));
			})
			.catch(() => {
				toast.error(__('Failed to delete log file.', 'all-feedback'));
			})
			.finally(() => {
				setDeletingFiles((prev) => {
					const next = new Set(prev);
					next.delete(file.id);
					return next;
				});
			});
	};

	const isPending = isListPending;

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
							disabled={isDeletingAll || isPending}
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
						disabled={isPending}
						onClick={() => queryClient.invalidateQueries({ queryKey: logsQuery().queryKey })}
					>
						<RefreshCw className={cn('size-3.5', isPending && 'animate-spin')} />
						{__('Refresh', 'all-feedback')}
					</Button>
				</div>
			</div>

			{/* filter tabs — only visible once entries have been loaded */}
			{allEntries.length > 0 && (
				<div className="flex items-center gap-2 border-b border-border/50 px-6 py-3.5">
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
			{allEntries.length > 0 && (
				<div className="border-t border-border/50 px-6 py-3 text-right">
					<span className="text-[12px] text-muted-foreground/55">
						{countFor(activeFilter)} {__('entries', 'all-feedback')}
						{activeFilter !== 'ALL' && (
							<> · {allEntries.length} {__('total', 'all-feedback')}</>
						)}
					</span>
				</div>
			)}
		</div>
	);
};

export default Logs;
