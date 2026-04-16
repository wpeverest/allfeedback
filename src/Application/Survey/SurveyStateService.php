<?php

declare(strict_types=1);

namespace AllFeedback\Application\Survey;

defined( 'ABSPATH' ) || exit;

/**
 * Class SurveyStateService
 *
 * Reads and writes per-user survey display state stored in WordPress user_meta.
 *
 * State shape (stored as JSON):
 *   impressions  — how many times the widget panel was opened by this user
 *   submitted    — true once the user submits a response
 *   dismissed_at — Unix timestamp (ms) of the last explicit close, or null
 *
 * Meta key: _allfb_survey_state_{surveyId}
 *
 * Only used for logged-in users. Guest state is managed client-side in
 * localStorage by the JS StateManager.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */
class SurveyStateService {

	/**
	 * User meta key prefix.
	 *
	 * @since 1.0.0
	 */
	private const META_PREFIX = '_allfb_survey_state_';

	/**
	 * Return the display state for a given user + survey combination.
	 *
	 * @return array{impressions: int, submitted: bool, dismissed_at: int|null}
	 * @since 1.0.0
	 */
	public function getState( int $userId, int $surveyId ): array {
		$raw     = get_user_meta( $userId, self::META_PREFIX . $surveyId, true );
		$decoded = ( is_string( $raw ) && $raw !== '' ) ? json_decode( $raw, true ) : null;

		return [
			'impressions'  => isset( $decoded['impressions'] ) ? (int) $decoded['impressions'] : 0,
			'submitted'    => isset( $decoded['submitted'] )   ? (bool) $decoded['submitted']  : false,
			'dismissed_at' => isset( $decoded['dismissed_at'] ) ? (int) $decoded['dismissed_at'] : null,
		];
	}

	/**
	 * Increment the impression counter by one.
	 *
	 * @since 1.0.0
	 */
	public function recordImpression( int $userId, int $surveyId ): void {
		$state = $this->getState( $userId, $surveyId );
		$state['impressions']++;
		$this->saveState( $userId, $surveyId, $state );
	}

	/**
	 * Record the timestamp of an explicit panel dismissal (X button click).
	 *
	 * @since 1.0.0
	 */
	public function recordDismissal( int $userId, int $surveyId ): void {
		$state = $this->getState( $userId, $surveyId );
		$state['dismissed_at'] = (int) round( microtime( true ) * 1000 ); // ms
		$this->saveState( $userId, $surveyId, $state );
	}

	/**
	 * Mark the survey as submitted for this user.
	 *
	 * Once submitted, the widget will never show again for this user
	 * regardless of frequency settings.
	 *
	 * @since 1.0.0
	 */
	public function recordSubmit( int $userId, int $surveyId ): void {
		$state = $this->getState( $userId, $surveyId );
		$state['submitted'] = true;
		$this->saveState( $userId, $surveyId, $state );
	}

	/**
	 * Persist the state array to user_meta as JSON.
	 *
	 * @param array{impressions: int, submitted: bool, dismissed_at: int|null} $state
	 * @since 1.0.0
	 */
	private function saveState( int $userId, int $surveyId, array $state ): void {
		update_user_meta( $userId, self::META_PREFIX . $surveyId, wp_json_encode( $state ) );
	}
}
