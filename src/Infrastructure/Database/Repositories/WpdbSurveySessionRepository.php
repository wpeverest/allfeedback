<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Database\Repositories;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Analytics\SurveySession;
use AllFeedback\Domain\Analytics\SurveySessionRepository;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter

/**
 * wpdb-backed implementation of SurveySessionRepository.
 *
 * @package AllFeedback\Infrastructure\Database\Repositories
 * @since   1.0.0
 */
class WpdbSurveySessionRepository implements SurveySessionRepository {

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

		$fmt     = 'Y-m-d H:i:s';
		$toStr   = static fn( ?\DateTimeImmutable $d ): ?string => $d?->format( $fmt );

		$data = [
			'survey_id'      => $session->getSurveyId(),
			'session_id'     => $session->getSessionId(),
			'user_id'        => $session->getUserId(),
			'guest_id'       => $session->getGuestId(),
			'status'         => $session->getStatus(),
			'started_at'     => $toStr( $session->getStartedAt() ),
			'submitted_at'   => $toStr( $session->getSubmittedAt() ),
			'abandoned_at'   => $toStr( $session->getAbandonedAt() ),
			'last_active_at' => $session->getLastActiveAt()->format( $fmt ),
			'created_at'     => $session->getCreatedAt()->format( $fmt ),
		];

		$formats = [ '%d', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s' ];

		if ( $session->isNew() ) {
			$result = $wpdb->insert( $this->table, $data, $formats );

			if ( false === $result ) {
				throw new \RuntimeException( 'Failed to insert survey session: ' . esc_html( $wpdb->last_error ) );
			}

			$session->setId( (int) $wpdb->insert_id );
		} else {
			$result = $wpdb->update(
				$this->table,
				[
					'status'         => $session->getStatus(),
					'started_at'     => $toStr( $session->getStartedAt() ),
					'submitted_at'   => $toStr( $session->getSubmittedAt() ),
					'abandoned_at'   => $toStr( $session->getAbandonedAt() ),
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
	 * @param  string $sessionId Client-generated session UUID.
	 * @return SurveySession|null
	 * @since  1.0.0
	 */
	public function findBySessionId( string $sessionId ): ?SurveySession {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM `{$this->table}` WHERE session_id = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$sessionId
			),
			ARRAY_A
		);

		return $row ? SurveySession::reconstitute( $row ) : null;
	}

	/**
	 * Return session analytics for multiple surveys in a single query, keyed by survey_id.
	 *
	 * @param  int[] $surveyIds Survey primary keys.
	 * @return array<int, array<string, int|float|null>>
	 * @since  1.0.0
	 */
	public function getAnalyticsForAllSurveys( array $surveyIds ): array {
		if ( empty( $surveyIds ) ) {
			return [];
		}

		global $wpdb;

		$timeout      = self::ABANDON_TIMEOUT_MINUTES;
		$placeholders = implode( ',', array_fill( 0, count( $surveyIds ), '%d' ) );

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
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
				...$surveyIds
			),
			ARRAY_A
		) ?: [];

		$result = [];
		foreach ( $rows as $row ) {
			$id            = (int) $row['survey_id'];
			$result[ $id ] = [
				'total_views'         => (int) $row['total_views'],
				'total_starts'        => (int) $row['total_starts'],
				'total_submissions'   => (int) $row['total_submissions'],
				'completion_rate'     => $row['completion_rate']     !== null ? (float) $row['completion_rate']     : null,
				'abandonment_rate'    => $row['abandonment_rate']    !== null ? (float) $row['abandonment_rate']    : null,
				'avg_completion_time' => $row['avg_completion_time'] !== null ? (int)   $row['avg_completion_time'] : null,
			];
		}

		return $result;
	}

	/**
	 * Return aggregate analytics for a survey using timestamps as source of truth.
	 * Abandonment includes explicit closes AND timed-out started sessions.
	 *
	 * @param  int $surveyId Survey primary key.
	 * @return array<string, int|float|null>
	 * @since  1.0.0
	 */
	public function getAnalytics( int $surveyId ): array {
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
				$surveyId
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
			'completion_rate'     => $row['completion_rate']     !== null ? (float) $row['completion_rate']     : null,
			'abandonment_rate'    => $row['abandonment_rate']    !== null ? (float) $row['abandonment_rate']    : null,
			'avg_completion_time' => $row['avg_completion_time'] !== null ? (int)   $row['avg_completion_time'] : null,
		];
	}
}
