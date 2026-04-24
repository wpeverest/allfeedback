import type { SessionMetrics } from '@/admin/api/analytics';
import { analyticsFormDetailQuery, analyticsFormsQuery } from '@/admin/queries/analytics';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import {
	ArcElement,
	CategoryScale,
	Chart as ChartJS,
	Filler,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	Tooltip,
} from 'chart.js';
import { AlertCircle, BarChart2 } from 'lucide-react';
import { useState } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	ArcElement,
	Filler,
	Tooltip,
	Legend,
);

const FunnelBar = ({
	label,
	value,
	max,
	color,
}: {
	label: string;
	value: number;
	max:   number;
	color: string;
}) => {
	const pct = max > 0 ? (value / max) * 100 : 0;
	return (
		<div>
			<div className="mb-1.5 flex items-center justify-between">
				<span className="text-sm font-medium text-foreground">{label}</span>
				<span className="text-sm tabular-nums text-muted-foreground">{value.toLocaleString()}</span>
			</div>
			<div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full transition-all"
					style={{ width: `${pct}%`, backgroundColor: color }}
				/>
			</div>
		</div>
	);
};

const SessionFunnel = ({
	metrics,
	loading,
}: {
	metrics: SessionMetrics | null;
	loading: boolean;
}) => {
	const primary  = '#6366F1';
	const amber    = '#FBBF24';
	const emerald  = '#22C55E';

	return (
		<div className="rounded-xl border border-border bg-card p-5 h-full">
			<h2 className="mb-4 text-sm font-semibold text-foreground">{__('Completion Rate', 'all-feedback')}</h2>
			{loading ? (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i}>
							<div className="mb-1.5 flex justify-between">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-10" />
							</div>
							<Skeleton className="h-2.5 w-full rounded-full" />
						</div>
					))}
				</div>
			) : metrics === null || metrics.total_views === 0 ? (
				<div className="flex h-[200px] items-center justify-center">
					<p className="text-sm text-muted-foreground">
						{__('No session data yet.', 'all-feedback')}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					<FunnelBar label={__('Views', 'all-feedback')}       value={metrics.total_views}       max={metrics.total_views} color={primary} />
					<FunnelBar label={__('Starts', 'all-feedback')}      value={metrics.total_starts}      max={metrics.total_views} color={amber} />
					<FunnelBar label={__('Completions', 'all-feedback')} value={metrics.total_submissions} max={metrics.total_views} color={emerald} />
				</div>
			)}
		</div>
	);
};

const ResponsesOverTimeChart = ({
	data,
	loading,
}: {
	data:    Record<string, number> | null;
	loading: boolean;
}) => {
	const entries = data ? Object.entries(data).sort(([a], [b]) => a.localeCompare(b)) : [];
	const labels  = entries.map(([date]) => {
		const [, month, day] = date.split('-');
		return `${month}-${day}`;
	});
	const values = entries.map(([, count]) => count);
	const totalResponses = values.reduce((sum, val) => sum + val, 0);

	const chartData = {
		labels,
		datasets: [
			{
				label:           __('Responses', 'all-feedback'),
				data:            values,
				borderColor:     '#6366F1',
				backgroundColor: 'rgba(99, 102, 241, 0.08)',
				borderWidth:     2,
				pointRadius:     0,
				pointHoverRadius: 5,
				pointBackgroundColor: '#fff',
				pointBorderColor: '#6366F1',
				pointBorderWidth: 2,
				fill:            true,
				tension:         0.4,
			},
		],
	};

	const options = {
		responsive:          true,
		maintainAspectRatio: false,
		layout: {
			padding: { top: 20, left: -10, right: 0, bottom: 0 },
		},
		plugins: {
			legend: { display: false },
			tooltip: {
				mode: 'index' as const,
				intersect: false,
				backgroundColor: 'rgba(255, 255, 255, 0.95)',
				titleColor: '#1e293b',
				bodyColor: '#475569',
				borderColor: '#e2e8f0',
				borderWidth: 1,
				padding: 10,
				displayColors: false,
				callbacks: {
					label: (ctx: { parsed: { y: number } }) => ` ${ctx.parsed.y}`,
				},
			},
		},
		scales: {
			x: {
				grid:  { display: false, drawBorder: false },
				ticks: { color: '#94A3B8', font: { size: 11 }, maxTicksLimit: 5, padding: 10 },
				border: { display: false },
			},
			y: {
				beginAtZero: true,
				grid: {
					color: '#f8fafc',
					tickLength: 0,
					drawBorder: false,
				},
				border: { display: false, dash: [4, 4] },
				ticks: {
					display: false,
				},
			},
		},
	};

	return (
		<div className="col-span-1 rounded-xl border border-border bg-card p-6 lg:col-span-2">
			<div className="mb-8 flex items-start justify-between">
				<div>
					<h2 className="text-base font-semibold text-foreground">{__('Responses over time', 'all-feedback')}</h2>
				</div>
				<Badge className="bg-primary/10 text-primary hover:bg-primary/10 shadow-none border-0 font-medium">
					{totalResponses.toLocaleString()} {__('total', 'all-feedback')}
				</Badge>
			</div>
			<div className="h-[280px] w-full">
				{loading ? (
					<Skeleton className="h-full w-full rounded-lg" />
				) : !entries.length ? (
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-muted-foreground">
							{__('No response data yet.', 'all-feedback')}
						</p>
					</div>
				) : (
					<Line data={chartData} options={options} />
				)}
			</div>
		</div>
	);
};

const DeviceBreakdownChart = ({
	data,
	loading,
}: {
	data:    { desktop: number; mobile: number; tablet: number } | null;
	loading: boolean;
}) => {
	const total   = data ? data.desktop + data.mobile + data.tablet : 0;
	const isEmpty = total === 0;

	const chartData = {
		labels:   [__('Desktop', 'all-feedback'), __('Mobile', 'all-feedback'), __('Tablet', 'all-feedback')],
		datasets: [
			{
				data:            [data?.desktop ?? 0, data?.mobile ?? 0, data?.tablet ?? 0],
				backgroundColor: ['#6366F1', '#22C55E', '#FBBF24'],
				borderWidth:     0,
				hoverOffset:     4,
			},
		],
	};

	const options = {
		responsive:          true,
		maintainAspectRatio: true,
		cutout:              '68%',
		plugins: {
			legend: {
				position:  'bottom' as const,
				labels:    { boxWidth: 10, padding: 16, font: { size: 12 }, color: '#64748B' },
			},
			tooltip: {
				callbacks: {
					label: (ctx: { parsed: number; label: string }) => {
						const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
						return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
					},
				},
			},
		},
	};

	return (
		<div className="rounded-xl border border-border bg-card p-5 h-full">
			<h2 className="mb-4 text-sm font-semibold text-foreground">{__('Response Distribution', 'all-feedback')}</h2>
			{loading ? (
				<div className="flex items-center justify-center py-8">
					<Skeleton className="size-36 rounded-full" />
				</div>
			) : isEmpty ? (
				<div className="flex h-[200px] items-center justify-center">
					<p className="text-sm text-muted-foreground">
						{__('No response data yet.', 'all-feedback')}
					</p>
				</div>
			) : (
				<div className="mx-auto max-w-[260px]">
					<Doughnut data={chartData} options={options} />
				</div>
			)}
		</div>
	);
};

const Analytics = () => {
	const [selectedFormId, setSelectedFormId] = useState<string>('all');

	const { data: formsData, isLoading: formsLoading, isError: formsError } = useQuery({
		...analyticsFormsQuery({ per_page: 50 }),
	});

	const forms = formsData?.forms ?? [];

	const isAll = selectedFormId === 'all';

	const { data: detailData, isLoading: detailLoading } = useQuery({
		...analyticsFormDetailQuery(Number(selectedFormId)),
		enabled: !isAll && selectedFormId !== null,
	});

	let sm: SessionMetrics | null = null;
	let rm = null;

	if (isAll) {
		if (forms.length > 0) {
			let totalViews = 0;
			let totalStarts = 0;
			let totalSubs = 0;
			forms.forEach((f) => {
				totalViews += f.session_metrics.total_views || 0;
				totalStarts += f.session_metrics.total_starts || 0;
				totalSubs += f.session_metrics.total_submissions || 0;
			});
			sm = {
				total_views: totalViews,
				total_starts: totalStarts,
				total_submissions: totalSubs,
				completion_rate: totalViews > 0 ? (totalSubs / totalViews) * 100 : 0,
				abandonment_rate: totalViews > 0 ? ((totalStarts - totalSubs) / totalViews) * 100 : 0,
				avg_completion_time: null,
			};
		}
	} else {
		sm = detailData?.session_metrics ?? null;
		rm = detailData?.response_metrics ?? null;
	}

	if (formsError) {
		return (
			<div className="p-5 md:p-6">
				<div className="rounded-xl border border-border bg-card">
					<EmptyState
						icon={AlertCircle}
						title={__('Failed to load analytics', 'all-feedback')}
						description={__('Something went wrong. Please try refreshing the page.', 'all-feedback')}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="p-5 md:p-6 space-y-6">
			<div className="flex flex-row items-center gap-4">
				<div className="w-full max-w-lg">
					{formsLoading ? (
						<Skeleton className="h-10 w-full" />
					) : (
						<Select
							value={selectedFormId}
							onValueChange={setSelectedFormId}
						>
							<SelectTrigger>
								<SelectValue placeholder={__('Select a form...', 'all-feedback')} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{__('All Forms', 'all-feedback')}</SelectItem>
								{forms.map((f) => (
									<SelectItem key={f.id} value={String(f.id)}>
										{f.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2">
				<ResponsesOverTimeChart data={rm?.responses_over_time ?? null} loading={isAll ? false : detailLoading} />
			</div>
			<div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
				<SessionFunnel metrics={sm} loading={isAll ? formsLoading : detailLoading} />
				<DeviceBreakdownChart data={rm?.response_rate_by_device ?? null} loading={isAll ? false : detailLoading} />
			</div>
		</div>
	);
};

export default Analytics;
