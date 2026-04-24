import type { SessionMetrics } from '@/admin/api/analytics';
import { analyticsFormDetailQuery, analyticsFormsQuery, analyticsOverviewQuery } from '@/admin/queries/analytics';
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
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
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

const StatCard = ({
	title,
	value,
	change,
	suffix = '',
	loading,
}: {
	title:    string;
	value:    string | number | null;
	change?:   number | null;
	suffix?:   string;
	loading?: boolean;
}) => (
	<div className="rounded-xl border border-border bg-card p-5">
		<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
		{loading ? (
			<div className="space-y-2">
				<Skeleton className="h-7 w-20" />
				<Skeleton className="h-4 w-24" />
			</div>
		) : (
			<div className="flex items-end justify-between">
				<div>
					<h3 className="text-2xl font-bold text-foreground">
						{value ?? '0'}{suffix}
					</h3>
					{change !== undefined && change !== null && (
						<div className={`mt-1 flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
							{change >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
							{Math.abs(change)}%
							<span className="text-muted-foreground font-normal ml-0.5">{__('vs last week', 'all-feedback')}</span>
						</div>
					)}
				</div>
			</div>
		)}
	</div>
);

const RecentResponsesList = ({
	loading,
	responses = [],
}: {
	loading: boolean;
	responses?: any[];
}) => {
	const getRelativeTime = (dateStr: string) => {
		const date = new Date(dateStr.replace(' ', 'T'));
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) return __('just now', 'all-feedback');
		if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
		if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
		return `${Math.floor(diffInSeconds / 86400)}d ago`;
	};

	const getScoreConfig = (score: number | null) => {
		if (score === null) return { bg: 'bg-muted', text: 'text-muted-foreground' };
		if (score >= 9) return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
		if (score >= 7) return { bg: 'bg-amber-50', text: 'text-amber-700' };
		return { bg: 'bg-rose-50', text: 'text-rose-700' };
	};

	return (
		<div className="rounded-xl border border-border bg-card overflow-hidden h-full flex flex-col">
			<div className="p-5 flex items-center justify-between border-b border-border/50">
				<h2 className="text-sm font-semibold text-foreground">{__('Recent responses', 'all-feedback')}</h2>
				 
			</div>
			<div className="flex-1 overflow-auto">
				{loading ? (
					<div className="p-5 space-y-6">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="flex gap-4">
								<Skeleton className="size-10 rounded-lg shrink-0" />
								<div className="space-y-2 flex-1">
									<div className="flex justify-between">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-4 w-12" />
									</div>
									<Skeleton className="h-4 w-full" />
								</div>
							</div>
						))}
					</div>
				) : responses.length === 0 ? (
					<div className="flex h-full min-h-[200px] items-center justify-center p-5">
						<p className="text-sm text-muted-foreground">
							{__('No recent responses.', 'all-feedback')}
						</p>
					</div>
				) : (
					<div className="divide-y divide-border/50">
						{responses.map((resp) => {
							const config = getScoreConfig(resp.score);
							return (
								<div key={resp.id} className="p-5 space-y-3">
									<div className="flex items-start justify-between gap-4">
										<div className="flex items-center gap-3">
											<div className={`size-10 rounded-lg ${config.bg} ${config.text} flex items-center justify-center font-bold text-lg shrink-0`}>
												{resp.score ?? '-'}
											</div>
											<div className="min-w-0">
												<div className="flex items-center gap-2 mb-0.5">
													{resp.survey_type && (
														<Badge variant="outline" className="text-[10px] uppercase font-bold py-0 px-1.5 h-4 border-muted-foreground/30">
															{resp.survey_type}
														</Badge>
													)}
													<span className="text-xs font-medium text-muted-foreground truncate">
														{resp.survey_title}
													</span>
												</div>
											</div>
										</div>
										<span className="text-[11px] text-muted-foreground whitespace-nowrap pt-1">
											{getRelativeTime(resp.created_at)}
										</span>
									</div>
									{resp.response_text && (
										<p className="text-sm text-foreground line-clamp-2 leading-relaxed italic opacity-90 pl-1">
											"{resp.response_text}"
										</p>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

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
	data:    Record<string, number> | { date: string; count: number }[] | null;
	loading: boolean;
}) => {
	let labels: string[] = [];
	let values: number[] = [];

	if (Array.isArray(data)) {
		labels = data.map((d) => {
			const [, month, day] = d.date.split('-');
			return `${month}-${day}`;
		});
		values = data.map((d) => d.count);
	} else if (data) {
		const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
		labels = entries.map(([date]) => {
			const [, month, day] = date.split('-');
			return `${month}-${day}`;
		});
		values = entries.map(([, count]) => count);
	}

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
				) : !labels.length ? (
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

	const { data: overviewData, isLoading: overviewLoading } = useQuery({
		...analyticsOverviewQuery(),
		enabled: isAll,
	});

	const stats = overviewData?.stats;

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

			{isAll && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
					<StatCard
						title={__('Total Feedback', 'all-feedback')}
						value={stats?.total_feedback.value}
						change={stats?.total_feedback.change}
						loading={overviewLoading}
					/>
					<StatCard
						title={__('Completion Rate', 'all-feedback')}
						value={stats?.completion_rate.value}
						change={stats?.completion_rate.change}
						suffix="%"
						loading={overviewLoading}
					/>
					<StatCard
						title={__('Average Rating', 'all-feedback')}
						value={stats?.avg_rating.value}
						change={stats?.avg_rating.change}
						loading={overviewLoading}
					/>
					<StatCard
						title={__('Active Surveys', 'all-feedback')}
						value={stats?.active_surveys.value}
						loading={overviewLoading}
					/>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2">
				<ResponsesOverTimeChart
					data={isAll ? overviewData?.chart : detailData?.response_metrics.responses_over_time}
					loading={isAll ? overviewLoading : detailLoading}
				/>
			</div>

			<div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
				{isAll ? (
					<RecentResponsesList
						loading={overviewLoading}
						responses={overviewData?.recent_responses}
					/>
				) : (
					<SessionFunnel
						metrics={detailData?.session_metrics ?? null}
						loading={detailLoading}
					/>
				)}
				<DeviceBreakdownChart
					data={isAll ? (overviewData?.device_breakdown as any) : detailData?.response_metrics.response_rate_by_device}
					loading={isAll ? overviewLoading : detailLoading}
				/>
			</div>
		</div>
	);
};

export default Analytics;
