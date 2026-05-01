<?php
/**
 * Track session event service.
 *
 * @package AllFeedback\Application\Analytics
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Application\Analytics;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Analytics\SurveySession;
use AllFeedback\Domain\Analytics\SurveySessionRepository;
use DateTimeImmutable;

/**
 * Use-case service: record a single analytics event for a survey session.
 *
 * All transitions are idempotent — calling the same event multiple times
 * for the same session_id is safe.
 *
 * @package AllFeedback\Application\Analytics
 * @since   1.0.0
 */
class TrackSessionEventService {

	/**
	 * Constructor.
	 *
	 * @param  SurveySessionRepository $session_repository Persistence layer for session aggregates.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveySessionRepository $session_repository,
	) {}

	/**
	 * Process one analytics event.
	 *
	 * @param  int         $survey_id  Target survey.
	 * @param  string      $event     One of: viewed | started | abandoned | heartbeat.
	 * @param  string      $session_id Client-generated UUID (v4).
	 * @param  int|null    $user_id    WordPress user ID, or null for guests.
	 * @param  string|null $guest_id   Persistent guest token from localStorage.
	 * @return void
	 * @since  1.0.0
	 */
	public function execute(
		int $survey_id,
		string $event,
		string $session_id,
		?int $user_id,
		?string $guest_id,
	): void {
		$now = new DateTimeImmutable();

		switch ( $event ) {
			case 'viewed':
				$existing = $this->session_repository->findBySessionId( $session_id );
				if ( $existing === null ) {
					$session = new SurveySession(
						survey_id: $survey_id,
						session_id: $session_id,
						user_id: $user_id,
						guest_id: $guest_id,
					);
					$this->session_repository->save( $session );
				}
				break;

			case 'started':
				$session = $this->session_repository->findBySessionId( $session_id );
				if ( $session === null ) {
					break;
				}
				$session->markStarted( $now );
				$this->session_repository->save( $session );
				break;

			case 'abandoned':
				$session = $this->session_repository->findBySessionId( $session_id );
				if ( $session === null || $session->isSubmitted() ) {
					break;
				}
				$session->markAbandoned( $now );
				$this->session_repository->save( $session );
				break;

			case 'heartbeat':
				$session = $this->session_repository->findBySessionId( $session_id );
				if ( $session === null ) {
					break;
				}
				$session->touchActive( $now );
				$this->session_repository->save( $session );
				break;
		}
	}
}
