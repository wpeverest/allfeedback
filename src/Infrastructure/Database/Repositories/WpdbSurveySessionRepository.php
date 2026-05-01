<?php
/**
 * Wpdb survey session repository.
 *
 * @package AllFeedback\Infrastructure\Database\Repositories
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Database\Repositories;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Analytics\SurveySession;
use AllFeedback\Domain\Analytics\SurveySessionRepository;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter

/**
 * Wpdb-backed implementation of SurveySessionRepository.
 *
 * @package AllFeedback\Infrastructure\Database\Repositories
 * @since   1.0.0
 */
class WpdbSurveySessionRepository implements SurveySessionRepository {

	// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare -- $this->table is a trusted class property, never user input

	/**
	 * Fully-qualified table name including the wpdb prefix.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private string $table;

	/**
	 * Inactivity threshold in minutes after which a started session is treated as abandoned.
	 *
	 * @var int
	 * @since 1.0.0
	 */
	private const ABANDON_TIMEOUT_MINUTES = 30;

	/**
	 * Constructor.
	 *
	 * @since  1.0.0
	 */
	public function __construct() {
		global $wpdb;
		$this->table = $wpdb->prefix . 'af_survey_sessions';
	}

	/**
	 * Insert or update a SurveySession.
	 *
	 * @param  SurveySession $session The aggregate to persist.
	 * @return SurveySession The saved instance with its persistence ID assigned.
	 * @throws \RuntimeException When the wpdb insert or update fails.
	 * @since  1.0.0
	 */
	public function save( SurveySession $session ): SurveySession {
		global $wpdb;

		$fmt    = 'Y-m-d H:i:s';
		$to_str = static fn( ?\DateTimeImmutable $d ): ?string => $d?->format( $fmt );

		$data = [
			'survey_id'      => $session->getSurveyId(),
			'session_id'     => $session->getSessionId(),
			'user_id'        => $session->getUserId(),
			'guest_id'       => $session->getGuestId(),
			'status'         => $session->getStatus(),
			'started_at'     => $to_str( $session->getStartedAt() ),
			'submitted_at'   => $to_str( $session->getSubmittedAt() ),
			'abandoned_at'   => $to_str( $session->getAbandonedAt() ),
			'last_active_at' => $session->getLastActiveAt()->format( $fmt ),
			'created_at'     => $session->getCreatedAt()->format( $fmt ),
		];

		$formats = [ '%d', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s' ];

		if ( $session->isNew() ) {
			$result = $wpdb->insert( $this->table, $data, $formats );

			if ( false === $result ) {
				throw new \RuntimeException( 'Failed to insert survey session: ' . esc_html( $wpdb->last_error ) );
			}

			$session->assignId( (int) $wpdb->insert_id );
		} else {
			$result = $wpdb->update(
				$this->table,
				[
					'status'         => $session->getStatus(),
					'started_at'     => $to_str( $session->getStartedAt() ),
					'submitted_at'   => $to_str( $session->getSubmittedAt() ),
					'abandoned_at'   => $to_str( $session->getAbandonedAt() ),
					'last_active_at' => $session->getLastActiveAt()->format( $fmt ),
				],
				[ 'id' => $session->getId() ],
				[ '%s', '%s', '%s', '%s', '%s' ],
				[ '%d' ]
			);

			if ( false === $result ) {
				throw new \RuntimeException( 'Failed to update survey session: ' . esc_html( $wpdb->last_error ) );
			}
		}

		return $session;
	}

	/**
	 * Find a session by its client-generated UUID, or null when absent.
	 *
	 * @param  string $session_id Client-generated session UUID.
	 * @return SurveySession|null
	 * @since  1.0.0
	 */
	public function findBySessionId( string $session_id ): ?SurveySession {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM `{$this->table}` WHERE session_id = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$session_id
			),
			ARRAY_A
		);

		return $row ? SurveySession::reconstitute( $row ) : null;
	}

	/**
	 * Return completion-rate stats for the overview panel in one conditional-aggregation query.
	 *
	 * Replaces three getGlobalAnalytics() calls (global + two WoW windows) with a single pass.
	 *
	 * @return array{completion_rate: float|null, this_week_completion_rate: float|null, last_week_completion_rate: float|null}
	 * @since  1.0.0
	 */
	public function getOverviewSessionStats(): array {
		global $wpdb;

		$t = self::ABANDON_TIMEOUT_MINUTES;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					ROUND(
						SUM(started_at IS NOT NULL AND submitted_at IS NOT NULL)
						/ NULLIF(SUM(started_at IS NOT NULL), 0) * 100
					, 2)                                                                                    AS completion_rate,
					ROUND(
						SUM(started_at IS NOT NULL AND submitted_at IS NOT NULL AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY))
						/ NULLIF(SUM(started_at IS NOT NULL AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)), 0) * 100
					, 2)                                                                                    AS this_week_completion_rate,
					ROUND(
						SUM(started_at IS NOT NULL AND submitted_at IS NOT NULL
						    AND DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
						                             AND DATE_SUB(CURDATE(), INTERVAL 7 DAY))
						/ NULLIF(SUM(started_at IS NOT NULL
						             AND DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
						                                      AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0) * 100
					, 2)                                                                                    AS last_week_completion_rate,
					ROUND(
						SUM(
							abandoned_at IS NOT NULL
							OR (started_at IS NOT NULL AND submitted_at IS NULL
							    AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE))
						)
						/ NULLIF(SUM(started_at IS NOT NULL), 0) * 100
					, 2)                                                                                    AS abandonment_rate,
					ROUND(
						SUM(
							DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
							AND (
								abandoned_at IS NOT NULL
								OR (started_at IS NOT NULL AND submitted_at IS NULL
								    AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE))
							)
						)
						/ NULLIF(SUM(started_at IS NOT NULL AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)), 0) * 100
					, 2)                                                                                    AS this_week_abandonment_rate,
					ROUND(
						SUM(
							DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
							                     AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)
							AND (
								abandoned_at IS NOT NULL
								OR (started_at IS NOT NULL AND submitted_at IS NULL
								    AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE))
							)
						)
						/ NULLIF(SUM(started_at IS NOT NULL
						             AND DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
						                                      AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0) * 100
					, 2)                                                                                    AS last_week_abandonment_rate
				FROM `{$this->table}`
				WHERE abandoned_at IS NOT NULL
				   OR started_at   IS NOT NULL
				   OR submitted_at IS NOT NULL
				   OR last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE)",
				$t,
				$t,
				$t,
				$t
			),
			ARRAY_A
		);

		return [
			'completion_rate'             => isset( $row['completion_rate'] ) ? (float) $row['completion_rate'] : null,
			'this_week_completion_rate'   => isset( $row['this_week_completion_rate'] ) ? (float) $row['this_week_completion_rate'] : null,
			'last_week_completion_rate'   => isset( $row['last_week_completion_rate'] ) ? (float) $row['last_week_completion_rate'] : null,
			'abandonment_rate'            => isset( $row['abandonment_rate'] ) ? (float) $row['abandonment_rate'] : null,
			'this_week_abandonment_rate'  => isset( $row['this_week_abandonment_rate'] ) ? (float) $row['this_week_abandonment_rate'] : null,
			'last_week_abandonment_rate'  => isset( $row['last_week_abandonment_rate'] ) ? (float) $row['last_week_abandonment_rate'] : null,
		];
	}

	/**
	 * Same as getOverviewSessionStats() but scoped to a specific set of survey IDs.
	 *
	 * @param  int[] $survey_ids Survey primary keys to include.
	 * @return array{completion_rate: float|null, this_week_completion_rate: float|null, last_week_completion_rate: float|null, abandonment_rate: float|null, this_week_abandonment_rate: float|null, last_week_abandonment_rate: float|null}
	 * @since  1.0.0
	 */
	public function getOverviewSessionStatsForSurveys( array $survey_ids ): array {
		if ( empty( $survey_ids ) ) {
			return [
				'completion_rate'            => null,
				'this_week_completion_rate'  => null,
				'last_week_completion_rate'  => null,
				'abandonment_rate'           => null,
				'this_week_abandonment_rate' => null,
				'last_week_abandonment_rate' => null,
			];
		}

		global $wpdb;

		$t            = self::ABANDON_TIMEOUT_MINUTES;
		$placeholders = implode( ',', array_fill( 0, count( $survey_ids ), '%d' ) );

		$params = array_merge( [ $t, $t, $t ], $survey_ids, [ $t ] );
		$row    = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					ROUND(
						SUM(started_at IS NOT NULL AND submitted_at IS NOT NULL)
						/ NULLIF(SUM(started_at IS NOT NULL), 0) * 100
					, 2)                                                                                    AS completion_rate,
					ROUND(
						SUM(started_at IS NOT NULL AND submitted_at IS NOT NULL AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY))
						/ NULLIF(SUM(started_at IS NOT NULL AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)), 0) * 100
					, 2)                                                                                    AS this_week_completion_rate,
					ROUND(
						SUM(started_at IS NOT NULL AND submitted_at IS NOT NULL
						    AND DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
						                             AND DATE_SUB(CURDATE(), INTERVAL 7 DAY))
						/ NULLIF(SUM(started_at IS NOT NULL
						             AND DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
						                                      AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0) * 100
					, 2)                                                                                    AS last_week_completion_rate,
					ROUND(
						SUM(
							abandoned_at IS NOT NULL
							OR (started_at IS NOT NULL AND submitted_at IS NULL
							    AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE))
						)
						/ NULLIF(SUM(started_at IS NOT NULL), 0) * 100
					, 2)                                                                                    AS abandonment_rate,
					ROUND(
						SUM(
							DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
							AND (
								abandoned_at IS NOT NULL
								OR (started_at IS NOT NULL AND submitted_at IS NULL
								    AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE))
							)
						)
						/ NULLIF(SUM(started_at IS NOT NULL AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)), 0) * 100
					, 2)                                                                                    AS this_week_abandonment_rate,
					ROUND(
						SUM(
							DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
							                     AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)
							AND (
								abandoned_at IS NOT NULL
								OR (started_at IS NOT NULL AND submitted_at IS NULL
								    AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE))
							)
						)
						/ NULLIF(SUM(started_at IS NOT NULL
						             AND DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
						                                      AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0) * 100
					, 2)                                                                                    AS last_week_abandonment_rate
				FROM `{$this->table}`
				WHERE survey_id IN ({$placeholders})
				  AND (
				  	   abandoned_at IS NOT NULL
				  	   OR started_at   IS NOT NULL
				  	   OR submitted_at IS NOT NULL
				  	   OR last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE)
				  )",
				...$params
			),
			ARRAY_A
		);

		return [
			'completion_rate'            => isset( $row['completion_rate'] ) ? (float) $row['completion_rate'] : null,
			'this_week_completion_rate'  => isset( $row['this_week_completion_rate'] ) ? (float) $row['this_week_completion_rate'] : null,
			'last_week_completion_rate'  => isset( $row['last_week_completion_rate'] ) ? (float) $row['last_week_completion_rate'] : null,
			'abandonment_rate'           => isset( $row['abandonment_rate'] ) ? (float) $row['abandonment_rate'] : null,
			'this_week_abandonment_rate' => isset( $row['this_week_abandonment_rate'] ) ? (float) $row['this_week_abandonment_rate'] : null,
			'last_week_abandonment_rate' => isset( $row['last_week_abandonment_rate'] ) ? (float) $row['last_week_abandonment_rate'] : null,
		];
	}

	/**
	 * Return aggregate session metrics across every survey, optionally filtered by date range.
	 *
	 * @param  string|null $date_from Optional start date Y-m-d.
	 * @param  string|null $date_to   Optional end date Y-m-d.
	 * @return array<string, int|float|null>
	 * @since  1.0.0
	 */
	public function getGlobalAnalytics( ?string $date_from = null, ?string $date_to = null ): array {
		global $wpdb;

		$timeout = self::ABANDON_TIMEOUT_MINUTES;
		$where   = [];
		$params  = [ $timeout ];

		if ( $date_from !== null ) {
			$where[]  = 'DATE(created_at) >= %s';
			$params[] = $date_from;
		}

		if ( $date_to !== null ) {
			$where[]  = 'DATE(created_at) <= %s';
			$params[] = $date_to;
		}

		$where_clause = $where !== [] ? 'AND ' . implode( ' AND ', $where ) : '';

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					COUNT(*)                                                                     AS total_views,
					SUM(started_at   IS NOT NULL)                                                AS total_starts,
					SUM(submitted_at IS NOT NULL)                                                AS total_submissions,
					ROUND(
						SUM(submitted_at IS NOT NULL)
						/ NULLIF( SUM(started_at IS NOT NULL), 0 ) * 100
					, 2)                                                                         AS completion_rate,
					ROUND(
						SUM(
							abandoned_at IS NOT NULL
							OR (
								started_at   IS NOT NULL
								AND submitted_at IS NULL
								AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE)
							)
						)
						/ NULLIF( SUM(started_at IS NOT NULL), 0 ) * 100
					, 2)                                                                         AS abandonment_rate,
					ROUND(
						AVG(
							CASE
								WHEN started_at IS NOT NULL AND submitted_at IS NOT NULL
								THEN TIMESTAMPDIFF(SECOND, started_at, submitted_at)
							END
						)
					, 0)                                                                         AS avg_completion_time
				FROM `{$this->table}`
				WHERE 1=1 {$where_clause}",
				...$params
			),
			ARRAY_A
		);

		if ( ! $row ) {
			return [
				'total_views'         => 0,
				'total_starts'        => 0,
				'total_submissions'   => 0,
				'completion_rate'     => null,
				'abandonment_rate'    => null,
				'avg_completion_time' => null,
			];
		}

		return [
			'total_views'         => (int) $row['total_views'],
			'total_starts'        => (int) $row['total_starts'],
			'total_submissions'   => (int) $row['total_submissions'],
			'completion_rate'     => $row['completion_rate'] !== null ? (float) $row['completion_rate'] : null,
			'abandonment_rate'    => $row['abandonment_rate'] !== null ? (float) $row['abandonment_rate'] : null,
			'avg_completion_time' => $row['avg_completion_time'] !== null ? (int) $row['avg_completion_time'] : null,
		];
	}

	/**
	 * Return session analytics for multiple surveys in a single query, keyed by survey_id.
	 *
	 * @param  int[] $survey_ids Survey primary keys.
	 * @return array<int, array<string, int|float|null>>
	 * @since  1.0.0
	 */
	public function getAnalyticsForAllSurveys( array $survey_ids ): array {
		if ( empty( $survey_ids ) ) {
			return [];
		}

		global $wpdb;

		$timeout      = self::ABANDON_TIMEOUT_MINUTES;
		$placeholders = implode( ',', array_fill( 0, count( $survey_ids ), '%d' ) );

		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT
					survey_id,
					COUNT(*)                                                                     AS total_views,
					SUM(started_at   IS NOT NULL)                                                AS total_starts,
					SUM(submitted_at IS NOT NULL)                                                AS total_submissions,
					ROUND(
						SUM(submitted_at IS NOT NULL)
						/ NULLIF( SUM(started_at IS NOT NULL), 0 ) * 100
					, 2)                                                                         AS completion_rate,
					ROUND(
						SUM(
							abandoned_at IS NOT NULL
							OR (
								started_at   IS NOT NULL
								AND submitted_at IS NULL
								AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE)
							)
						)
						/ NULLIF( SUM(started_at IS NOT NULL), 0 ) * 100
					, 2)                                                                         AS abandonment_rate,
					ROUND(
						AVG(
							CASE
								WHEN started_at IS NOT NULL AND submitted_at IS NOT NULL
								THEN TIMESTAMPDIFF(SECOND, started_at, submitted_at)
							END
						)
					, 0)                                                                         AS avg_completion_time
				FROM `{$this->table}`
				WHERE survey_id IN ({$placeholders})
				GROUP BY survey_id",
				$timeout,
				...$survey_ids
			),
			ARRAY_A
		);
		$rows = $rows !== null && $rows !== false ? $rows : [];

		$result = [];
		foreach ( $rows as $row ) {
			$id            = (int) $row['survey_id'];
			$result[ $id ] = [
				'total_views'         => (int) $row['total_views'],
				'total_starts'        => (int) $row['total_starts'],
				'total_submissions'   => (int) $row['total_submissions'],
				'completion_rate'     => $row['completion_rate'] !== null ? (float) $row['completion_rate'] : null,
				'abandonment_rate'    => $row['abandonment_rate'] !== null ? (float) $row['abandonment_rate'] : null,
				'avg_completion_time' => $row['avg_completion_time'] !== null ? (int) $row['avg_completion_time'] : null,
			];
		}

		return $result;
	}

	/**
	 * Return full session analytics for one survey with WoW windows in one conditional-aggregation query.
	 *
	 * @param  int $survey_id Survey primary key.
	 * @return array<string, int|float|null>
	 * @since  1.0.0
	 */
	public function getFormSessionStatsWithWoW( int $survey_id ): array {
		global $wpdb;

		$t = self::ABANDON_TIMEOUT_MINUTES;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					COUNT(*)                                                                                    AS total_views,
					SUM(started_at   IS NOT NULL)                                                               AS total_starts,
					SUM(submitted_at IS NOT NULL)                                                               AS total_submissions,
					ROUND(
						AVG(
							CASE
								WHEN started_at IS NOT NULL AND submitted_at IS NOT NULL
								THEN TIMESTAMPDIFF(SECOND, started_at, submitted_at)
							END
						)
					, 0)                                                                                        AS avg_completion_time,
					ROUND(
						SUM(submitted_at IS NOT NULL)
						/ NULLIF(SUM(started_at IS NOT NULL), 0) * 100
					, 2)                                                                                        AS completion_rate,
					ROUND(
						SUM(submitted_at IS NOT NULL AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY))
						/ NULLIF(SUM(started_at IS NOT NULL AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)), 0) * 100
					, 2)                                                                                        AS this_week_completion_rate,
					ROUND(
						SUM(submitted_at IS NOT NULL
						    AND DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
						                             AND DATE_SUB(CURDATE(), INTERVAL 7 DAY))
						/ NULLIF(SUM(started_at IS NOT NULL
						             AND DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
						                                      AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0) * 100
					, 2)                                                                                        AS last_week_completion_rate,
					ROUND(
						SUM(
							abandoned_at IS NOT NULL
							OR (started_at IS NOT NULL AND submitted_at IS NULL
							    AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE))
						)
						/ NULLIF(SUM(started_at IS NOT NULL), 0) * 100
					, 2)                                                                                        AS abandonment_rate,
					ROUND(
						SUM(
							DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
							AND (
								abandoned_at IS NOT NULL
								OR (started_at IS NOT NULL AND submitted_at IS NULL
								    AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE))
							)
						)
						/ NULLIF(SUM(started_at IS NOT NULL AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)), 0) * 100
					, 2)                                                                                        AS this_week_abandonment_rate,
					ROUND(
						SUM(
							DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
							                     AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)
							AND (
								abandoned_at IS NOT NULL
								OR (started_at IS NOT NULL AND submitted_at IS NULL
								    AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE))
							)
						)
						/ NULLIF(SUM(started_at IS NOT NULL
						             AND DATE(created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY)
						                                      AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0) * 100
					, 2)                                                                                        AS last_week_abandonment_rate
				FROM `{$this->table}`
				WHERE survey_id = %d",
				$t,
				$t,
				$t,
				$survey_id
			),
			ARRAY_A
		);

		if ( ! $row ) {
			return [
				'total_views'                => 0,
				'total_starts'               => 0,
				'total_submissions'          => 0,
				'avg_completion_time'        => null,
				'completion_rate'            => null,
				'this_week_completion_rate'  => null,
				'last_week_completion_rate'  => null,
				'abandonment_rate'           => null,
				'this_week_abandonment_rate' => null,
				'last_week_abandonment_rate' => null,
			];
		}

		return [
			'total_views'                => (int) $row['total_views'],
			'total_starts'               => (int) $row['total_starts'],
			'total_submissions'          => (int) $row['total_submissions'],
			'avg_completion_time'        => $row['avg_completion_time'] !== null ? (int) $row['avg_completion_time'] : null,
			'completion_rate'            => $row['completion_rate'] !== null ? (float) $row['completion_rate'] : null,
			'this_week_completion_rate'  => $row['this_week_completion_rate'] !== null ? (float) $row['this_week_completion_rate'] : null,
			'last_week_completion_rate'  => $row['last_week_completion_rate'] !== null ? (float) $row['last_week_completion_rate'] : null,
			'abandonment_rate'           => $row['abandonment_rate'] !== null ? (float) $row['abandonment_rate'] : null,
			'this_week_abandonment_rate' => $row['this_week_abandonment_rate'] !== null ? (float) $row['this_week_abandonment_rate'] : null,
			'last_week_abandonment_rate' => $row['last_week_abandonment_rate'] !== null ? (float) $row['last_week_abandonment_rate'] : null,
		];
	}

	/**
	 * Return aggregate analytics for a survey using timestamps as source of truth.
	 * Abandonment includes explicit closes AND timed-out started sessions.
	 *
	 * @param  int $survey_id Survey primary key.
	 * @return array<string, int|float|null>
	 * @since  1.0.0
	 */
	public function getAnalytics( int $survey_id ): array {
		global $wpdb;

		$timeout = self::ABANDON_TIMEOUT_MINUTES;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					COUNT(*)                                                                     AS total_views,
					SUM(started_at   IS NOT NULL)                                                AS total_starts,
					SUM(submitted_at IS NOT NULL)                                                AS total_submissions,
					ROUND(
						SUM(submitted_at IS NOT NULL)
						/ NULLIF( SUM(started_at IS NOT NULL), 0 ) * 100
					, 2)                                                                         AS completion_rate,
					ROUND(
						SUM(
							abandoned_at IS NOT NULL
							OR (
								started_at   IS NOT NULL
								AND submitted_at IS NULL
								AND last_active_at < DATE_SUB(NOW(), INTERVAL %d MINUTE)
							)
						)
						/ NULLIF( SUM(started_at IS NOT NULL), 0 ) * 100
					, 2)                                                                         AS abandonment_rate,
					ROUND(
						AVG(
							CASE
								WHEN started_at IS NOT NULL AND submitted_at IS NOT NULL
								THEN TIMESTAMPDIFF(SECOND, started_at, submitted_at)
							END
						)
					, 0)                                                                         AS avg_completion_time
				FROM `{$this->table}`
				WHERE survey_id = %d",
				$timeout,
				$survey_id
			),
			ARRAY_A
		);

		if ( ! $row ) {
			return [
				'total_views'          => 0,
				'total_starts'         => 0,
				'total_submissions'    => 0,
				'completion_rate'      => null,
				'abandonment_rate'     => null,
				'avg_completion_time'  => null,
			];
		}

		return [
			'total_views'         => (int) $row['total_views'],
			'total_starts'        => (int) $row['total_starts'],
			'total_submissions'   => (int) $row['total_submissions'],
			'completion_rate'     => $row['completion_rate'] !== null ? (float) $row['completion_rate'] : null,
			'abandonment_rate'    => $row['abandonment_rate'] !== null ? (float) $row['abandonment_rate'] : null,
			'avg_completion_time' => $row['avg_completion_time'] !== null ? (int) $row['avg_completion_time'] : null,
		];
	}
}
