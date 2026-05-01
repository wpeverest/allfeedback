<?php
/**
 * Survey session repository.
 *
 * @package AllFeedback\Domain\Analytics
 * @since   1.0.0
 */

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
	 * @param  string $session_id Client-generated session UUID.
	 * @return SurveySession|null
	 * @since  1.0.0
	 */
	public function findBySessionId( string $session_id ): ?SurveySession;

	/**
	 * Return aggregate analytics metrics for a single survey.
	 *
	 * Keys: total_views, total_starts, total_submissions,
	 *       completion_rate, abandonment_rate, avg_completion_time.
	 *
	 * @param  int $survey_id Survey primary key.
	 * @return array<string, int|float|null>
	 * @since  1.0.0
	 */
	public function getAnalytics( int $survey_id ): array;

	/**
	 * Return session analytics for multiple surveys in a single query.
	 *
	 * Returns an array keyed by survey_id. Each value has the same shape as
	 * getAnalytics(): total_views, total_starts, total_submissions,
	 * completion_rate, abandonment_rate, avg_completion_time.
	 *
	 * @param  int[] $survey_ids Survey primary keys to include.
	 * @return array<int, array<string, int|float|null>>
	 * @since  1.0.0
	 */
	public function getAnalyticsForAllSurveys( array $survey_ids ): array;

	/**
	 * Return aggregate session metrics across every survey, optionally filtered by date range.
	 *
	 * Keys: total_views, total_starts, total_submissions,
	 *       completion_rate, abandonment_rate, avg_completion_time.
	 *
	 * @param  string|null $date_from Optional start date Y-m-d (filters on session created_at).
	 * @param  string|null $date_to   Optional end date Y-m-d.
	 * @return array<string, int|float|null>
	 * @since  1.0.0
	 */
	public function getGlobalAnalytics( ?string $date_from = null, ?string $date_to = null ): array;

	/**
	 * Return completion-rate and abandonment-rate stats for the overview panel in one query.
	 *
	 * Uses conditional aggregation to compute global, this-week, and last-week values
	 * for both completion and abandonment in a single SQL pass.
	 *
	 * Keys: completion_rate, this_week_completion_rate, last_week_completion_rate,
	 *       abandonment_rate, this_week_abandonment_rate, last_week_abandonment_rate.
	 *
	 * @return array{completion_rate: float|null, this_week_completion_rate: float|null, last_week_completion_rate: float|null, abandonment_rate: float|null, this_week_abandonment_rate: float|null, last_week_abandonment_rate: float|null}
	 * @since  1.0.0
	 */
	public function getOverviewSessionStats(): array;

	/**
	 * Same as getOverviewSessionStats() but scoped to a specific set of survey IDs.
	 *
	 * Used by the weekly digest to restrict completion/abandonment stats to
	 * currently-published surveys only.
	 *
	 * Keys: completion_rate, this_week_completion_rate, last_week_completion_rate,
	 *       abandonment_rate, this_week_abandonment_rate, last_week_abandonment_rate.
	 *
	 * @param  int[] $survey_ids Survey primary keys to include.
	 * @return array{completion_rate: float|null, this_week_completion_rate: float|null, last_week_completion_rate: float|null, abandonment_rate: float|null, this_week_abandonment_rate: float|null, last_week_abandonment_rate: float|null}
	 * @since  1.0.0
	 */
	public function getOverviewSessionStatsForSurveys( array $survey_ids ): array;

	/**
	 * Return full session analytics for one survey with week-over-week windows in one query.
	 *
	 * Returns the same base metrics as getAnalytics() plus this-week/last-week slices
	 * for both completion rate and abandonment rate, enabling the controller to compute
	 * WoW percentage changes without a second query.
	 *
	 * Keys: total_views, total_starts, total_submissions, avg_completion_time,
	 *       completion_rate, this_week_completion_rate, last_week_completion_rate,
	 *       abandonment_rate, this_week_abandonment_rate, last_week_abandonment_rate.
	 *
	 * @param  int $survey_id Survey primary key.
	 * @return array<string, int|float|null>
	 * @since  1.0.0
	 */
	public function getFormSessionStatsWithWoW( int $survey_id ): array;
}
