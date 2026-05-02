import type { FormAnalyticsListItem } from '@/admin/api/analytics';
import {
	analyticsFormDetailQuery,
	analyticsFormsQuery,
	analyticsOverviewQuery,
} from '@/admin/queries/analytics';
import { allResponsesQuery, surveyResponsesQuery } from '@/admin/queries/surveys';
import { EmptyState } from '@/components/ui/empty-state';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router';
import { __ } from '@wordpress/i18n';
import { AlertCircle, BarChart2 } from 'lucide-react';
import { useMemo } from 'react';
import type { AreaChartData, DonutData } from './analytics.types';
import { formatSeconds, groupByWeek } from './analytics.utils';
import { AreaChartCard } from './components/AreaChartCard';
import { DeviceDistributionCard } from './components/DeviceDistributionCard';
import { KPICard } from './components/KPICard';
import { NpsDistributionCard } from './components/NpsDistributionCard';
import { RecentResponsesCard } from './components/RecentResponsesCard';
import { SessionMetricsCard } from './components/SessionMetricsCard';

function FormSelector({
	forms,
	selectedId,
	onChange,
}: {
	forms: FormAnalyticsListItem[];
	selectedId: number | null;
	onChange: (id: number | null) => void;
}) {
	const value = selectedId !== null ? String(selectedId) : 'all';
	return (
		<Select
			value={value}
			onValueChange={(v) => onChange(v === 'all' ? null : Number(v))}
		>
			<SelectTrigger className="w-[220px]">
				<SelectValue placeholder={__('All forms', 'allfeedback')} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">{__('All forms', 'allfeedback')}</SelectItem>
				{forms.map((f) => (
					<SelectItem key={f.id} value={String(f.id)}>
						{f.title}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

const Analytics = () => {
	const { formId } = useSearch({ from: '/_app/analytics/' });
	const navigate = useNavigate();
	const selectedFormId = formId ?? null;
	const setSelectedFormId = (id: number | null) => {
		void navigate({ to: '/analytics', search: { formId: id !== null ? id : undefined } });
	};

	const {
		data: listData,
		isLoading: listLoading,
		isFetching: listFetching,
		isError,
	} = useQuery({
		...analyticsFormsQuery({ per_page: 100 }),
		placeholderData: keepPreviousData,
	});
	const {
		data: detailData,
		isLoading: detailLoading,
		isFetching: detailFetching,
	} = useQuery({
		...analyticsFormDetailQuery(selectedFormId ?? 0),
		enabled: selectedFormId !== null,
		placeholderData: keepPreviousData,
	});
	const { data: responsesData, isLoading: responsesLoading } = useQuery({
		...allResponsesQuery({ per_page: 5 }),
		placeholderData: keepPreviousData,
	});
	const { data: formResponsesData, isLoading: formResponsesLoading } = useQuery({
		...surveyResponsesQuery(selectedFormId ?? 0, { per_page: 5 }),
		enabled: selectedFormId !== null,
		placeholderData: keepPreviousData,
	});
	const {
		data: overviewData,
		isLoading: overviewLoading,
		isFetching: overviewFetching,
	} = useQuery({
		...analyticsOverviewQuery(),
		placeholderData: keepPreviousData,
	});

	const forms = listData?.forms ?? [];
	const totals = listData?.totals;
	const isNavigating = useRouterState({ select: (s) => s.isLoading });
	const isFormView = selectedFormId !== null;
	const loading = listLoading;
	const isRefetching =
		isNavigating ||
		(isFormView
			? detailFetching
			: (listFetching && !listLoading) || (overviewFetching && !overviewLoading));

	const kpi = useMemo(() => {
		if (isFormView && detailData) {
			const sm = detailData.session_metrics;
			const rm = detailData.response_metrics;

			let totalChange: number | null = null;
			const rot = rm.responses_over_time;
			if (rot) {
				const today = new Date();
				const toISO = (d: Date) => d.toISOString().slice(0, 10);
				const twStart = new Date(today);
				twStart.setDate(today.getDate() - 6);
				const lwStart = new Date(today);
				lwStart.setDate(today.getDate() - 13);
				const lwEnd = new Date(today);
				lwEnd.setDate(today.getDate() - 7);
				const twStr = toISO(twStart);
				const lwStartStr = toISO(lwStart);
				const lwEndStr = toISO(lwEnd);
				let thisWeek = 0,
					lastWeek = 0;
				for (const [date, count] of Object.entries(rot)) {
					if (date >= twStr) thisWeek += count;
					else if (date >= lwStartStr && date <= lwEndStr) lastWeek += count;
				}
				if (lastWeek > 0)
					totalChange =
						Math.round(((thisWeek - lastWeek) / lastWeek) * 1000) / 10;
			}

			return {
				totalResponses: rm.total_responses,
				totalChange,
				completionRate: sm.completion_rate,
				completionChange: sm.completion_rate_change,
				thirdKind: 'time' as 'nps' | 'time' | 'abandonment',
				thirdValue: sm.avg_completion_time,
				thirdChange: null as number | null,
				fourthValue: sm.abandonment_rate,
				fourthIsFormView: true,
				fourthNewThisWeek: null as number | null,
				fourthChange: sm.abandonment_rate_change,
			};
		}
		const s = overviewData?.stats;
		return {
			totalResponses: s?.total_feedback.value ?? totals?.total_responses ?? 0,
			totalChange: s?.total_feedback.change ?? null,
			completionRate: s?.completion_rate.value ?? null,
			completionChange: s?.completion_rate.change ?? null,
			thirdKind: 'abandonment' as 'nps' | 'time' | 'abandonment',
			thirdValue: s?.abandonment_rate?.value ?? null,
			thirdChange: s?.abandonment_rate?.change ?? null,
			fourthValue:
				s?.active_surveys.value ??
				forms.filter((f) => f.status === 'published').length,
			fourthIsFormView: false,
			fourthNewThisWeek: s?.active_surveys.new_this_week ?? null,
			fourthChange: null as number | null,
		};
	}, [isFormView, detailData, overviewData, totals, forms]);

	const chartData: AreaChartData = useMemo(() => {
		if (isFormView && detailData?.response_metrics.responses_over_time) {
			const rot = detailData.response_metrics.responses_over_time;
			const entries = Object.entries(rot)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([date, count]) => ({ date, count }));
			return groupByWeek(entries);
		}
		const entries = (overviewData?.chart ?? [])
			.slice()
			.sort((a, b) => a.date.localeCompare(b.date));
		return groupByWeek(entries);
	}, [isFormView, detailData, overviewData]);

	const totalInPeriod = chartData.values.reduce((s, v) => s + v, 0);

	const npsData: DonutData = useMemo(() => {
		if (isFormView && detailData) {
			const nps = detailData.response_metrics.nps_score;
			return { total: nps.promoters + nps.passives + nps.detractors, ...nps };
		}
		return { total: 0, promoters: 0, passives: 0, detractors: 0, score: 0 };
	}, [isFormView, detailData]);

	const deviceBreakdown: Record<string, number> = useMemo(() => {
		if (isFormView && detailData)
			return detailData.response_metrics.response_rate_by_device;
		return overviewData?.device_breakdown ?? {};
	}, [isFormView, detailData, overviewData]);

	const isNpsForm =
		isFormView && detailData?.response_metrics.survey_type === 'NPS';

	if (isError) {
		return (
			<div className="px-4 py-5 sm:px-6 lg:px-8">
				<div style={{ background: 'var(--card)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}>
					<EmptyState
						icon={AlertCircle}
						title={__('Failed to load analytics', 'allfeedback')}
						description={__('Something went wrong. Please try refreshing the page.', 'allfeedback')}
					/>
				</div>
			</div>
		);
	}

	if (!listLoading && forms.length === 0) {
		return (
			<div className="px-4 py-5 sm:px-6 lg:px-8">
				<div style={{ background: 'var(--card)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}>
					<EmptyState
						icon={BarChart2}
						title={__('No data yet', 'allfeedback')}
						description={__('Analytics will appear here once your forms start receiving responses.', 'allfeedback')}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="px-4 pb-8 sm:px-6 lg:px-8">
			<div style={{ padding: '20px 0 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
				<FormSelector forms={forms} selectedId={selectedFormId} onChange={setSelectedFormId} />
			</div>

			<div style={{ transition: 'opacity 200ms ease', ...(isRefetching && { opacity: 0.5, pointerEvents: 'none' }) }}>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<KPICard
						label={__('Total feedback', 'allfeedback')}
						value={loading ? '—' : kpi.totalResponses.toLocaleString()}
						deltaValue={kpi.totalChange}
						deltaLabel={kpi.totalChange !== null ? __('vs. last week', 'allfeedback') : __('total responses', 'allfeedback')}
						loading={loading}
					/>
					<KPICard
						label={__('Completion rate', 'allfeedback')}
						value={loading ? '—' : kpi.completionRate !== null ? kpi.completionRate.toFixed(1) : '—'}
						unit="%"
						deltaValue={kpi.completionChange}
						deltaLabel={kpi.completionChange !== null ? __('vs. last week', 'allfeedback') : __('of sessions submitted', 'allfeedback')}
						loading={loading}
					/>
					{kpi.thirdKind === 'time' ? (
						<KPICard
							label={__('Avg. time', 'allfeedback')}
							value={loading ? '—' : formatSeconds(kpi.thirdValue)}
							deltaValue={null}
							deltaLabel={__('avg. completion time', 'allfeedback')}
							loading={loading}
						/>
					) : (
						<KPICard
							label={__('Abandonment rate', 'allfeedback')}
							value={
								loading
									? '—'
									: kpi.thirdValue !== null
										? kpi.thirdValue.toFixed(1)
										: '—'
							}
							unit="%"
							deltaValue={kpi.thirdChange}
							deltaLabel={
								kpi.thirdChange !== null
									? __('vs. last week', 'allfeedback')
									: __('of started sessions', 'allfeedback')
							}
							loading={loading}
						/>
					)}
					{kpi.fourthIsFormView ? (
						<KPICard
							label={__('Abandonment rate', 'allfeedback')}
							value={
								loading
									? '—'
									: kpi.fourthValue !== null
										? kpi.fourthValue.toFixed(1)
										: '—'
							}
							unit="%"
							deltaValue={kpi.fourthChange}
							deltaLabel={
								kpi.fourthChange !== null
									? __('vs. last week', 'allfeedback')
									: __('of started sessions', 'allfeedback')
							}
							loading={loading}
						/>
					) : (
						<KPICard
							label={__('Active surveys', 'allfeedback')}
							value={listLoading ? '—' : String(kpi.fourthValue ?? 0)}
							deltaValue={null}
							deltaLabel={
								kpi.fourthNewThisWeek !== null && kpi.fourthNewThisWeek > 0
									? `+${kpi.fourthNewThisWeek} ${__('new this week', 'allfeedback')}`
									: __('published', 'allfeedback')
							}
							loading={listLoading}
						/>
					)}
				</div>

				{isNpsForm ? (
					<div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[7fr_3fr]">
						<AreaChartCard chartData={chartData} loading={loading} totalInPeriod={totalInPeriod} />
						<NpsDistributionCard
							nps={npsData}
							scoreDist={detailData!.response_metrics.score_distribution}
							loading={detailLoading}
						/>
					</div>
				) : (
					<div style={{ marginTop: 16 }}>
						<AreaChartCard chartData={chartData} loading={loading} totalInPeriod={totalInPeriod} />
					</div>
				)}

				{isFormView ? (
					<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
						<RecentResponsesCard
							responses={formResponsesData?.responses ?? []}
							forms={forms}
							loading={formResponsesLoading}
							surveyId={selectedFormId ?? undefined}
						/>
						<SessionMetricsCard sm={detailData?.session_metrics ?? null} loading={detailLoading} />
						<DeviceDistributionCard breakdown={deviceBreakdown} loading={detailLoading} />
					</div>
				) : (
					<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
						<RecentResponsesCard
							responses={responsesData?.responses ?? []}
							forms={forms}
							loading={responsesLoading}
						/>
						<DeviceDistributionCard breakdown={deviceBreakdown} loading={listLoading} />
					</div>
				)}
			</div>
		</div>
	);
};

export default Analytics;
