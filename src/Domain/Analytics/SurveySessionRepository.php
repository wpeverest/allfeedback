<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Analytics;

defined( 'ABSPATH' ) || exit;

/**
 * Contract for persisting and querying SurveySession aggregates.
 *
 * @package AllFeedback\Domain\Analytics
 * @since   1.0.0
 */
interface SurveySessionRepository {

	/**
	 * Persist a new or updated SurveySession.
	 *
	 * @param  SurveySession $session The aggregate to persist.
	 * @return SurveySession The saved instance with its persistence ID assigned.
	 * @since  1.0.0
	 */
	public function save( SurveySession $session ): SurveySession;

	/**
	 * Find a session by its client-generated UUID, or null when absent.
	 *
	 * @param  string $sessionId Client-generated session UUID.
	 * @return SurveySession|null
	 * @since  1.0.0
	 */
	public function findBySessionId( string $sessionId ): ?SurveySession;

	/**
	 * Return aggregate analytics metrics for a single survey.
	 *
	 * Keys: total_views, total_starts, total_submissions,
	 *       completion_rate, abandonment_rate, avg_completion_time.
	 *
	 * @param  int $surveyId Survey primary key.
	 * @return array<string, int|float|null>
	 * @since  1.0.0
	 */
	public function getAnalytics( int $surveyId ): array;

	/**
	 * Return session analytics for multiple surveys in a single query.
	 *
	 * Returns an array keyed by survey_id. Each value has the same shape as
	 * getAnalytics(): total_views, total_starts, total_submissions,
	 * completion_rate, abandonment_rate, avg_completion_time.
	 *
	 * @param  int[] $surveyIds Survey primary keys to include.
	 * @return array<int, array<string, int|float|null>>
	 * @since  1.0.0
	 */
	public function getAnalyticsForAllSurveys( array $surveyIds ): array;

	/**
	 * Return aggregate session metrics across every survey, optionally filtered by date range.
	 *
	 * Keys: total_views, total_starts, total_submissions,
	 *       completion_rate, abandonment_rate, avg_completion_time.
	 *
	 * @param  string|null $dateFrom Optional start date Y-m-d (filters on session created_at).
	 * @param  string|null $dateTo   Optional end date Y-m-d.
	 * @return array<string, int|float|null>
	 * @since  1.0.0
	 */
	public function getGlobalAnalytics( ?string $dateFrom = null, ?string $dateTo = null ): array;

	/**
	 * Return completion-rate stats for the overview panel in one query.
	 *
	 * Uses conditional aggregation to compute the global, this-week, and last-week
	 * completion rates in a single SQL pass instead of three separate calls.
	 *
	 * Keys: completion_rate, this_week_completion_rate, last_week_completion_rate.
	 * "This week" = last 7 days; "last week" = 7–13 days ago.
	 *
	 * @return array{completion_rate: float|null, this_week_completion_rate: float|null, last_week_completion_rate: float|null}
	 * @since  1.0.0
	 */
	public function getOverviewSessionStats(): array;
}
