import { request, toQuery } from './client';
import type { PaginationParams } from './client';

export type SessionMetrics = {
	total_views:             number;
	total_starts:            number;
	total_submissions:       number;
	completion_rate:         number | null;
	completion_rate_change:  number | null;
	abandonment_rate:        number | null;
	abandonment_rate_change: number | null;
	avg_completion_time:     number | null;
};

export type NpsScore = {
	score:      number;
	promoters:  number;
	passives:   number;
	detractors: number;
};

export type FormResponseMetricsSummary = {
	total_responses: number;
	average_score:   number | null;
	nps_score:       NpsScore;
};

export type FormResponseMetricsDetail = FormResponseMetricsSummary & {
	score_distribution:      Record<number, number>;
	survey_type:             'NPS' | 'CSAT' | 'CES' | null;
	response_rate_by_device: {
		desktop: number;
		mobile:  number;
		tablet:  number;
	};
	responses_over_time: Record<string, number>;
};

export type FormAnalyticsListItem = {
	id:               number;
	title:            string;
	status:           string;
	response_count:   number;
	created_at:       string;
	updated_at:       string | null;
	session_metrics:  SessionMetrics;
	response_metrics: FormResponseMetricsSummary;
};

export type FormAnalyticsListParams = PaginationParams & {
	status?: string;
};

export type FormAnalyticsListResponse = {
	forms:      FormAnalyticsListItem[];
	pagination: {
		total:       number;
		total_pages: number;
		page:        number;
		per_page:    number;
	};
	totals: {
		total_forms:     number;
		total_responses: number;
		total_views:     number;
	};
};

export type FormAnalyticsDetail = {
	survey: {
		id:             number;
		title:          string;
		description:    string;
		status:         string;
		response_count: number;
		created_at:     string;
		updated_at:     string | null;
	};
	session_metrics:  SessionMetrics;
	response_metrics: FormResponseMetricsDetail;
};

export type AnalyticsOverview = {
	stats: {
		total_feedback:   { value: number;        change: number | null };
		completion_rate:  { value: number | null;  change: number | null };
		abandonment_rate: { value: number | null;  change: number | null };
		avg_rating:       { value: number | null;  change: number | null };
		active_surveys:   { value: number; new_this_week: number; change: number | null };
	};
	chart: { date: string; count: number }[];
	total_in_period: number;
	recent_responses: {
		id:            number;
		survey_id:     number;
		survey_title:  string;
		survey_type:   string | null;
		score:         number | null;
		response_text: string | null;
		created_at:    string;
	}[];
	device_breakdown: {
		desktop?: number;
		mobile?:  number;
		tablet?:  number;
		unknown?: number;
	};
};

export const analyticsApi = {
	listForms: (params?: FormAnalyticsListParams) =>
		request<FormAnalyticsListResponse>('/analytics/forms' + toQuery(params)),

	getFormAnalytics: (id: number) =>
		request<FormAnalyticsDetail>(`/analytics/forms/${id}`),

	getOverview: () =>
		request<AnalyticsOverview>('/analytics/overview'),
};
