<?php

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
 * @since 1.0.0
 */
class TrackSessionEventService {

	/** @since 1.0.0 */
	public function __construct(
		private readonly SurveySessionRepository $sessionRepository,
	) {}

	/**
	 * Process one analytics event.
	 *
	 * @param int         $surveyId  Target survey.
	 * @param string      $event     One of: viewed | started | abandoned | heartbeat.
	 * @param string      $sessionId Client-generated UUID (v4).
	 * @param int|null    $userId    WordPress user ID, or null for guests.
	 * @param string|null $guestId   Persistent guest token from localStorage.
	 * @since 1.0.0
	 */
	public function execute(
		int $surveyId,
		string $event,
		string $sessionId,
		?int $userId,
		?string $guestId,
	): void {
		$now = new DateTimeImmutable();

		switch ( $event ) {
			case 'viewed':
				$existing = $this->sessionRepository->findBySessionId( $sessionId );
				if ( $existing === null ) {
					$session = new SurveySession(
						surveyId: $surveyId,
						sessionId: $sessionId,
						userId: $userId,
						guestId: $guestId,
					);
					$this->sessionRepository->save( $session );
				}
				break;

			case 'started':
				$session = $this->sessionRepository->findBySessionId( $sessionId );
				if ( $session === null ) {
					break;
				}
				$session->markStarted( $now );
				$this->sessionRepository->save( $session );
				break;

			case 'abandoned':
				$session = $this->sessionRepository->findBySessionId( $sessionId );
				if ( $session === null || $session->isSubmitted() ) {
					break;
				}
				$session->markAbandoned( $now );
				$this->sessionRepository->save( $session );
				break;

			case 'heartbeat':
				$session = $this->sessionRepository->findBySessionId( $sessionId );
				if ( $session === null ) {
					break;
				}
				$session->touchActive( $now );
				$this->sessionRepository->save( $session );
				break;
		}
	}
}
