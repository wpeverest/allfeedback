import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { Info, RefreshCw, ScrollText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';

// ── types ─────────────────────────────────────────────────────────────────────

type LogLevel = 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG';

interface LogEntry {
	level: LogLevel;
	timestamp: string;
	message: string;
}

interface LogsData {
	files: number;
	size: string;
	entries: LogEntry[];
}

// ── api ───────────────────────────────────────────────────────────────────────

const fetchLogs = (): Promise<{ success: boolean; data: LogsData }> =>
	apiFetch({ path: '/all-feedback/v1/logs' });

const clearLogs = (): Promise<{ success: boolean }> =>
	apiFetch({ path: '/all-feedback/v1/logs', method: 'DELETE' });

const LOGS_KEY = ['allfb', 'logs'] as const;

// ── level badge ───────────────────────────────────────────────────────────────

const LEVEL_CLASSES: Record<LogLevel, string> = {
	ERROR:   'bg-destructive/10 text-destructive border-destructive/20',
	WARNING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
	INFO:    'bg-primary/10 text-primary border-primary/20',
	DEBUG:   'bg-muted text-muted-foreground border-border/50',
};

const LevelBadge = ({ level }: { level: LogLevel }) => (
	<span
		className={cn(
			'rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
			LEVEL_CLASSES[level],
		)}
	>
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

interface FilterTabProps {
	label: string;
	count: number;
	active: boolean;
	onClick: () => void;
}

const FilterTab = ({ label, count, active, onClick }: FilterTabProps) => (
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
		<span
			className={cn(
				'text-[11px] font-semibold',
				active ? 'text-primary' : 'text-muted-foreground/60',
			)}
		>
			{count}
		</span>
	</button>
);

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

// ── main component ────────────────────────────────────────────────────────────

const Logs = () => {
	const queryClient = useQueryClient();
	const [activeFilter, setActiveFilter] = useState<LogLevel | 'ALL'>('ALL');

	const { data, isPending, isError } = useQuery({
		queryKey: LOGS_KEY,
		queryFn:  fetchLogs,
		select:   (res) => res.data,
		retry:    false,
	});

	const { mutate: doClear, isPending: isClearing } = useMutation({
		mutationFn: clearLogs,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: LOGS_KEY });
			toast.success(__('Logs cleared successfully.', 'all-feedback'));
		},
		onError: () => {
			toast.error(__('Failed to clear logs. Please try again.', 'all-feedback'));
		},
	});

	const entries = data?.entries ?? [];

	const countFor = (level: LogLevel | 'ALL') =>
		level === 'ALL' ? entries.length : entries.filter((e) => e.level === level).length;

	const filtered =
		activeFilter === 'ALL' ? entries : entries.filter((e) => e.level === activeFilter);

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
					{data && (
						<p className="text-[12px] text-muted-foreground/60" style={{ margin: 0 }}>
							{data.files} {__('files', 'all-feedback')} · {data.size}
						</p>
					)}
				</div>

				<div className="ml-auto flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={isPending}
						onClick={() => queryClient.invalidateQueries({ queryKey: LOGS_KEY })}
					>
						<RefreshCw className={cn('size-3.5', isPending && 'animate-spin')} />
						{__('Refresh', 'all-feedback')}
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={isClearing || entries.length === 0}
						onClick={() => doClear()}
						className="text-destructive hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
					>
						<Trash2 className="size-3.5" />
						{__('Clear Logs', 'all-feedback')}
					</Button>
				</div>
			</div>

			{/* filter tabs */}
			{!!data && (
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

			{/* log list */}
			<div className="px-6 pb-4 pt-4">
				{isError || entries.length === 0 ? (
					<EmptyState />
				) : filtered.length === 0 ? (
					<p className="py-10 text-center text-[13px] text-muted-foreground/60">
						{__('No entries match this filter.', 'all-feedback')}
					</p>
				) : (
					<div className="space-y-2.5">
						{filtered.map((entry, i) => (
							<LogEntryRow key={i} entry={entry} />
						))}
					</div>
				)}
			</div>

			{/* footer */}
			{filtered.length > 0 && (
				<div className="border-t border-border/50 px-6 py-3 text-right">
					<span className="text-[12px] text-muted-foreground/55">
						{__('Showing', 'all-feedback')} {filtered.length} / {entries.length}
					</span>
				</div>
			)}
		</div>
	);
};

export default Logs;
