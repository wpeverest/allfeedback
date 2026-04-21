<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Analytics;

defined( 'ABSPATH' ) || exit;

/**
 * Contract for persisting and querying SurveySession aggregates.
 *
 * @since 1.0.0
 */
interface SurveySessionRepository {

	/**
	 * Persist a new or updated SurveySession.
	 *
	 * @since 1.0.0
	 */
	public function save( SurveySession $session ): SurveySession;

	/**
	 * Find a session by its client-generated UUID.
	 * Returns null when the session does not exist.
	 *
	 * @since 1.0.0
	 */
	public function findBySessionId( string $sessionId ): ?SurveySession;

	/**
	 * Return aggregate analytics metrics for a single survey.
	 *
	 * Keys: total_views, total_starts, total_submissions,
	 *       completion_rate, abandonment_rate, avg_completion_time.
	 *
	 * @return array<string, int|float|null>
	 * @since 1.0.0
	 */
	public function getAnalytics( int $surveyId ): array;
}
