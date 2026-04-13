import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ChevronDown, Download, Info, RefreshCw, ScrollText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';

// ── types ─────────────────────────────────────────────────────────────────────

type LogLevel = 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

interface LogEntry {
	level: LogLevel;
	timestamp: string;
	message: string;
}

interface LogFile {
	name: string;
	size: string;
	entries: LogEntry[];
}

interface LogsData {
	total_size: string;
	files: LogFile[];
}


// ── constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ── api ───────────────────────────────────────────────────────────────────────

const fetchLogs = (): Promise<{ success: boolean; data: LogsData }> =>
	apiFetch({ path: '/all-feedback/v1/logs' });

const deleteFile = (name: string): Promise<{ success: boolean }> =>
	apiFetch({ path: `/all-feedback/v1/logs/file?name=${encodeURIComponent(name)}`, method: 'DELETE' });

const LOGS_KEY = ['allfb', 'logs'] as const;

// ── level badge ───────────────────────────────────────────────────────────────

const LEVEL_CLASSES: Record<LogLevel, string> = {
	ERROR:   'bg-destructive/10 text-destructive border-destructive/20',
	WARNING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
	INFO:    'bg-primary/10 text-primary border-primary/20',
	DEBUG:   'bg-muted text-muted-foreground border-border/50',
};

const LevelBadge = ({ level }: { level: LogLevel }) => (
	<span className={cn('rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', LEVEL_CLASSES[level])}>
		{level}
	</span>
);

// ── filter tabs ───────────────────────────────────────────────────────────────

const FILTERS: { key: LogLevel | 'ALL'; label: string }[] = [
	{ key: 'ALL',     label: __('All',     'all-feedback') },
	{ key: 'ERROR',   label: __('Error',   'all-feedback') },
	{ key: 'WARNING', label: __('Warning', 'all-feedback') },
	{ key: 'INFO',    label: __('Info',    'all-feedback') },
	{ key: 'DEBUG',   label: __('Debug',   'all-feedback') },
];

const FilterTab = ({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) => (
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

// ── download helper ───────────────────────────────────────────────────────────

const triggerDownload = (filename: string, entries: LogEntry[]) => {
	const content = entries.map((e) => `[${e.timestamp}] [${e.level.padEnd(7)}] ${e.message}`).join('\n');
	const blob    = new Blob([content], { type: 'text/plain' });
	const url     = URL.createObjectURL(blob);
	const a       = document.createElement('a');
	a.href        = url;
	a.download    = filename;
	a.click();
	URL.revokeObjectURL(url);
};

// ── log entry ─────────────────────────────────────────────────────────────────

const LogEntryRow = ({ entry }: { entry: LogEntry }) => (
	<div className="rounded-lg border border-border/50 px-4 py-3">
		<div className="flex items-center gap-2.5">
			<Info className="size-[14px] shrink-0 text-muted-foreground/40" />
			<LevelBadge level={entry.level} />
			<span className="text-[12px] text-muted-foreground/60">{entry.timestamp}</span>
		</div>
		<p className="mt-2 pl-[22px] font-mono text-[12.5px] text-foreground/80">{entry.message}</p>
	</div>
);

// ── log file accordion ────────────────────────────────────────────────────────

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
	const [open, setOpen]         = useState(defaultOpen);
	const [showAll, setShowAll]   = useState(false);

	const filtered = activeFilter === 'ALL'
		? file.entries
		: file.entries.filter((e) => e.level === activeFilter);

	// hide the entire section if no entries match the active filter
	if (filtered.length === 0) return null;

	const visible   = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
	const remaining = filtered.length - PAGE_SIZE;

	return (
		<div className={cn('rounded-lg border border-border/50 transition-opacity', isDeleting && 'opacity-50')}>
			{/* accordion header */}
			<div
				className="flex cursor-pointer items-center gap-3 px-4 py-3 select-none"
				onClick={() => setOpen((o) => !o)}
			>
				<ChevronDown
					className={cn('size-[14px] shrink-0 text-muted-foreground/50 transition-transform', !open && '-rotate-90')}
				/>
				<span className="flex-1 font-mono text-[12.5px] font-medium text-foreground/80">
					{file.name}
				</span>
				<span className="text-[12px] text-muted-foreground/50">
					{filtered.length} {__('entries', 'all-feedback')} · {file.size}
				</span>

				{/* download & delete — stop propagation so they don't toggle the accordion */}
				<div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
					<button
						type="button"
						title={__('Download', 'all-feedback')}
						onClick={() => triggerDownload(file.name, file.entries)}
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
				<div className="space-y-2 border-t border-border/50 p-3">
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
				</div>
			)}
		</div>
	);
};

// ── empty state ───────────────────────────────────────────────────────────────

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
			<Link to="/settings/advanced" className="font-medium !text-primary underline underline-offset-2 hover:!opacity-80">
				{__('Settings → Advanced', 'all-feedback')}
			</Link>
			{'.'}
		</p>
	</div>
);

// ── main component ────────────────────────────────────────────────────────────

const Logs = () => {
	const queryClient                       = useQueryClient();
	const [activeFilter, setActiveFilter]   = useState<LogLevel | 'ALL'>('ALL');
	const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());

	const { data: rawData, isPending } = useQuery({
		queryKey: LOGS_KEY,
		queryFn:  fetchLogs,
		select:   (res) => res.data,
		retry:    false,
	});

	const data       = rawData ?? { total_size: '0 B', files: [] };
	const allEntries = data.files.flatMap((f) => f.entries);

	const countFor = (level: LogLevel | 'ALL') =>
		level === 'ALL' ? allEntries.length : allEntries.filter((e) => e.level === level).length;

	const handleDeleteFile = (name: string) => {
		setDeletingFiles((prev) => new Set(prev).add(name));
		deleteFile(name)
			.then(() => {
				queryClient.setQueryData<LogsData>(LOGS_KEY, (old) => {
					if (!old) return old;
					return { ...old, files: old.files.filter((f) => f.name !== name) };
				});
				toast.success(__('Log file deleted.', 'all-feedback'));
			})
			.catch(() => {
				toast.error(__('Failed to delete log file.', 'all-feedback'));
			})
			.finally(() => {
				setDeletingFiles((prev) => { const n = new Set(prev); n.delete(name); return n; });
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
						{data.files.length} {__('files', 'all-feedback')} · {data.total_size}
					</p>
				</div>
				<div className="ml-auto">
					<Button
						variant="outline"
						size="sm"
						disabled={isPending}
						onClick={() => queryClient.invalidateQueries({ queryKey: LOGS_KEY })}
					>
						<RefreshCw className={cn('size-3.5', isPending && 'animate-spin')} />
						{__('Refresh', 'all-feedback')}
					</Button>
				</div>
			</div>

			{/* filter tabs */}
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
				{allEntries.length === 0 ? (
					<EmptyState />
				) : (
					<div className="space-y-3">
						{data.files.map((file, i) => (
							<LogFileSection
								key={file.name}
								file={file}
								activeFilter={activeFilter}
								onDelete={() => handleDeleteFile(file.name)}
								isDeleting={deletingFiles.has(file.name)}
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
