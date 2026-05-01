<?php
/**
 * Survey state service.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */

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
	 * @var string
	 * @since 1.0.0
	 */
	private const META_PREFIX = '_allfb_survey_state_';

	/**
	 * Return the display state for a given user + survey combination.
	 *
	 * @param  int $user_id   WordPress user ID.
	 * @param  int $survey_id Survey primary key.
	 * @return array{impressions: int, submitted: bool, dismissed_at: int|null}
	 * @since  1.0.0
	 */
	public function getState( int $user_id, int $survey_id ): array {
		$raw     = get_user_meta( $user_id, self::META_PREFIX . $survey_id, true );
		$decoded = ( is_string( $raw ) && $raw !== '' ) ? json_decode( $raw, true ) : null;

		return [
			'impressions'  => isset( $decoded['impressions'] ) ? (int) $decoded['impressions'] : 0,
			'submitted'    => isset( $decoded['submitted'] ) ? (bool) $decoded['submitted'] : false,
			'dismissed_at' => isset( $decoded['dismissed_at'] ) ? (int) $decoded['dismissed_at'] : null,
		];
	}

	/**
	 * Increment the impression counter by one.
	 *
	 * @param  int $user_id   WordPress user ID.
	 * @param  int $survey_id Survey primary key.
	 * @return void
	 * @since  1.0.0
	 */
	public function recordImpression( int $user_id, int $survey_id ): void {
		$state = $this->getState( $user_id, $survey_id );
		++$state['impressions'];
		$this->saveState( $user_id, $survey_id, $state );
	}

	/**
	 * Record the timestamp of an explicit panel dismissal (X button click).
	 *
	 * @param  int $user_id   WordPress user ID.
	 * @param  int $survey_id Survey primary key.
	 * @return void
	 * @since  1.0.0
	 */
	public function recordDismissal( int $user_id, int $survey_id ): void {
		$state                 = $this->getState( $user_id, $survey_id );
		$state['dismissed_at'] = (int) round( microtime( true ) * 1000 );
		$this->saveState( $user_id, $survey_id, $state );
	}

	/**
	 * Mark the survey as submitted for this user.
	 *
	 * Once submitted, the widget will never show again for this user
	 * regardless of frequency settings.
	 *
	 * @param  int $user_id   WordPress user ID.
	 * @param  int $survey_id Survey primary key.
	 * @return void
	 * @since  1.0.0
	 */
	public function recordSubmit( int $user_id, int $survey_id ): void {
		$state              = $this->getState( $user_id, $survey_id );
		$state['submitted'] = true;
		$this->saveState( $user_id, $survey_id, $state );
	}

	/**
	 * Persist the state array to user_meta as JSON.
	 *
	 * @param  int                                                              $user_id   WordPress user ID.
	 * @param  int                                                              $survey_id Survey primary key.
	 * @param  array{impressions: int, submitted: bool, dismissed_at: int|null} $state    State to persist.
	 * @return void
	 * @since  1.0.0
	 */
	private function saveState( int $user_id, int $survey_id, array $state ): void {
		update_user_meta( $user_id, self::META_PREFIX . $survey_id, wp_json_encode( $state ) );
	}
}
