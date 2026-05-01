<?php
/**
 * Response repository.
 *
 * @package AllFeedback\Domain\Response
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Domain\Response;

defined( 'ABSPATH' ) || exit;

/**
 * Repository interface for the Response aggregate.
 *
 * Implementations are registered in the DI container and provide the actual
 * persistence mechanism (e.g. wpdb).
 *
 * @package AllFeedback\Domain\Response
 * @since   1.0.0
 */
interface ResponseRepository {

	/**
	 * Persist a new Response and return the saved instance.
	 *
	 * @param  Response $response The aggregate to persist.
	 * @return Response The saved instance with its persistence ID assigned.
	 * @since  1.0.0
	 */
	public function save( Response $response ): Response;

	/**
	 * Retrieve a single Response by its primary key, or null if not found.
	 *
	 * @param  int $id Response primary key.
	 * @return Response|null
	 * @since  1.0.0
	 */
	public function findById( int $id ): ?Response;

	/**
	 * Retrieve all Responses for a given Survey, applying the filter.
	 *
	 * @param  int            $survey_id Survey primary key.
	 * @param  ResponseFilter $filter   Query constraints and pagination.
	 * @return Response[]
	 * @since  1.0.0
	 */
	public function findBySurveyId( int $survey_id, ResponseFilter $filter ): array;

	/**
	 * Count all Responses for a given Survey, applying the filter.
	 *
	 * @param  int            $survey_id Survey primary key.
	 * @param  ResponseFilter $filter   Query constraints.
	 * @return int
	 * @since  1.0.0
	 */
	public function countBySurveyId( int $survey_id, ResponseFilter $filter ): int;

	/**
	 * Retrieve all Responses across every survey, applying the filter.
	 *
	 * @param  ResponseFilter $filter Query constraints and pagination.
	 * @return Response[]
	 * @since  1.0.0
	 */
	public function findAll( ResponseFilter $filter ): array;

	/**
	 * Count all Responses across every survey, applying the filter.
	 *
	 * @param  ResponseFilter $filter Query constraints.
	 * @return int
	 * @since  1.0.0
	 */
	public function countAll( ResponseFilter $filter ): int;

	/**
	 * Update specific columns of a Response row by its primary key.
	 *
	 * Only the keys present in $data are written; all values must already be
	 * safe for direct DB insertion (the implementation handles escaping).
	 *
	 * Accepted keys: response_data (JSON string), is_read (0|1).
	 *
	 * @param  int                  $id   Response primary key.
	 * @param  array<string, mixed> $data Column → value pairs to update.
	 * @return bool True on success.
	 * @since  1.0.0
	 */
	public function update( int $id, array $data ): bool;

	/**
	 * Permanently remove a single Response by its primary key.
	 *
	 * @param  int $id Response primary key.
	 * @return bool True on success.
	 * @since  1.0.0
	 */
	public function delete( int $id ): bool;

	/**
	 * Bulk-delete multiple Responses by their primary keys in a single query.
	 *
	 * Returns a list of IDs that were not found (and therefore not deleted), so
	 * callers can report partial failures without firing N individual queries.
	 *
	 * @param  int[] $ids Response primary keys to delete.
	 * @return int[]      IDs that were not found in the database.
	 * @since  1.0.0
	 */
	public function deleteMany( array $ids ): array;

	/**
	 * Bulk-delete multiple Responses that belong to a specific survey.
	 *
	 * Returns a list of IDs that either did not exist or did not belong to the
	 * given survey (and therefore were not deleted).
	 *
	 * @param  int[] $ids      Response primary keys to delete.
	 * @param  int   $survey_id Only delete responses belonging to this survey.
	 * @return int[]           IDs that were not deleted.
	 * @since  1.0.0
	 */
	public function deleteManyBySurveyId( array $ids, int $survey_id ): array;

	/**
	 * Permanently remove all Responses belonging to a given Survey.
	 *
	 * @param  int $survey_id Survey primary key.
	 * @return bool True on success.
	 * @since  1.0.0
	 */
	public function deleteBySurveyId( int $survey_id ): bool;

	/**
	 * Count all unread Responses across every non-trashed Survey.
	 *
	 * Used to render the unread badge in the WordPress admin sidebar.
	 *
	 * @return int
	 * @since  1.0.0
	 */
	public function countUnread(): int;

	/**
	 * Return true if a response from the given IP hash already exists for
	 * the survey within the look-back window.
	 *
	 * @param  int    $survey_id    Survey to check against.
	 * @param  string $ip_hash      HMAC hash of the visitor IP.
	 * @param  int    $window_hours How far back to look (0 = all-time).
	 * @return bool
	 * @since  1.0.0
	 */
	public function existsByIpHash( int $survey_id, string $ip_hash, int $window_hours = 0 ): bool;

	/**
	 * Bulk-update is_read for a set of response IDs in one query.
	 *
	 * Returns a list of IDs from $ids that did not exist in the database (and
	 * were therefore not updated), so callers can report partial failures.
	 *
	 * @param  int[] $ids    Response primary keys to update.
	 * @param  bool  $is_read Target read state.
	 * @return int[]          IDs that were not found (missing / not updated).
	 * @since  1.0.0
	 */
	public function bulkUpdateReadStatus( array $ids, bool $is_read ): array;

	/**
	 * Return true if a logged-in user has already submitted a response for this survey.
	 *
	 * @param  int $survey_id    Survey to check against.
	 * @param  int $user_id      WordPress user ID.
	 * @param  int $window_hours How far back to look (0 = all-time).
	 * @return bool
	 * @since  1.0.0
	 */
	public function existsByUserId( int $survey_id, int $user_id, int $window_hours = 0 ): bool;

	/**
	 * Return true if a guest visitor UUID has already submitted a response for this survey.
	 *
	 * @param  int    $survey_id    Survey to check against.
	 * @param  string $guest_token  UUID stored in the visitor's localStorage.
	 * @param  int    $window_hours How far back to look (0 = all-time).
	 * @return bool
	 * @since  1.0.0
	 */
	public function existsByGuestToken( int $survey_id, string $guest_token, int $window_hours = 0 ): bool;

	/**
	 * Aggregate score statistics for a survey using SQL.
	 *
	 * Returns: total, score_count, score_sum, promoters (9-10), passives (7-8), detractors (0-6).
	 *
	 * @param  int $survey_id Survey primary key.
	 * @return array{total: int, score_count: int, score_sum: float, promoters: int, passives: int, detractors: int}
	 * @since  1.0.0
	 */
	public function aggregateScoreStats( int $survey_id ): array;

	/**
	 * Count scored responses grouped by integer score (0–10) for a survey.
	 *
	 * Only rows where `score IS NOT NULL AND score BETWEEN 0 AND 10` are counted.
	 * Scores with zero responses are omitted from the result.
	 *
	 * @param  int $survey_id Survey primary key.
	 * @return array<int, int> score => count
	 * @since  1.0.0
	 */
	public function countByScore( int $survey_id ): array;

	/**
	 * Count responses grouped by device_type for a survey using SQL.
	 *
	 * @param  int $survey_id Survey primary key.
	 * @return array<string, int> device_type => count
	 * @since  1.0.0
	 */
	public function countByDevice( int $survey_id ): array;

	/**
	 * Count responses grouped by date (Y-m-d) for a survey using SQL.
	 *
	 * @param  int $survey_id Survey primary key.
	 * @return array<string, int> date => count (sorted ascending)
	 * @since  1.0.0
	 */
	public function countByDate( int $survey_id ): array;

	/**
	 * Aggregate score statistics for multiple surveys in a single query.
	 *
	 * Returns an array keyed by survey_id. Each value has the same shape as
	 * aggregateScoreStats(): total, score_count, score_sum, promoters, passives, detractors.
	 *
	 * @param  int[] $survey_ids Survey primary keys to include.
	 * @return array<int, array{total: int, score_count: int, score_sum: float, promoters: int, passives: int, detractors: int}>
	 * @since  1.0.0
	 */
	public function aggregateScoreStatsForAllSurveys( array $survey_ids ): array;

	/**
	 * Return all stats needed for the "all forms" overview panel in one query.
	 *
	 * Uses conditional aggregation so the overview endpoint fires one query
	 * instead of six (total count, two WoW windows, three score-stats calls).
	 *
	 * Keys: total_feedback, this_week_count, last_week_count,
	 *       avg_score, this_week_avg_score, last_week_avg_score.
	 * "This week" = last 7 days; "last week" = 7–13 days ago.
	 *
	 * @return array{total_feedback: int, this_week_count: int, last_week_count: int, avg_score: float|null, this_week_avg_score: float|null, last_week_avg_score: float|null}
	 * @since  1.0.0
	 */
	public function getOverviewStats(): array;

	/**
	 * Count all responses that fall within a date range (inclusive).
	 *
	 * @param  string $date_from Start date Y-m-d.
	 * @param  string $date_to   End date Y-m-d.
	 * @return int
	 * @since  1.0.0
	 */
	public function countAllInDateRange( string $date_from, string $date_to ): int;

	/**
	 * Aggregate score statistics across every survey, optionally filtered by date range.
	 *
	 * Returns: total, score_count, score_sum, avg_score, promoters, passives, detractors.
	 *
	 * @param  string|null $date_from Optional start date Y-m-d.
	 * @param  string|null $date_to   Optional end date Y-m-d.
	 * @return array{total: int, score_count: int, score_sum: float, avg_score: float|null, promoters: int, passives: int, detractors: int}
	 * @since  1.0.0
	 */
	public function getGlobalScoreStats( ?string $date_from = null, ?string $date_to = null ): array;

	/**
	 * Count responses grouped by device_type across every survey.
	 *
	 * @return array<string, int> device_type => count
	 * @since  1.0.0
	 */
	public function countByDeviceGlobal(): array;

	/**
	 * Count responses grouped by date (Y-m-d) across every survey within a date range.
	 *
	 * @param  string $date_from Start date Y-m-d.
	 * @param  string $date_to   End date Y-m-d.
	 * @return array<string, int> date => count (sorted ascending)
	 * @since  1.0.0
	 */
	public function countByDateGlobal( string $date_from, string $date_to ): array;

	/**
	 * Return this-week response count and average score per survey in one query.
	 *
	 * "This week" = last 7 days (DATE >= CURDATE() - 6).
	 * Surveys with no responses this week are omitted from the result.
	 *
	 * @param  int[] $survey_ids Survey primary keys to include.
	 * @return array<int, array{this_week_count: int, avg_score: float|null}> Keyed by survey ID.
	 * @since  1.0.0
	 */
	public function getWeeklyStatsBySurveyIds( array $survey_ids ): array;

	/**
	 * Same as getOverviewStats() but scoped to a specific set of survey IDs.
	 *
	 * Used by the weekly digest to restrict site-wide stats to currently-published surveys only.
	 *
	 * @param  int[] $survey_ids Survey primary keys to include.
	 * @return array{total_feedback: int, this_week_count: int, last_week_count: int, avg_score: float|null, this_week_avg_score: float|null, last_week_avg_score: float|null}
	 * @since  1.0.0
	 */
	public function getOverviewStatsForSurveys( array $survey_ids ): array;
}
