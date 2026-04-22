<?php

declare(strict_types=1);

namespace AllFeedback\Application\Response;

defined( 'ABSPATH' ) || exit;

/**
 * Immutable data-transfer object representing a survey response payload.
 *
 * @package AllFeedback\Application\Response
 * @since   1.0.0
 */
class ResponseDTO {

	/**
	 * @param  int         $surveyId     Survey primary key.
	 * @param  array<mixed> $responseData Raw key/value payload from the respondent.
	 * @param  float|null   $score        Optional numeric score.
	 * @param  string|null  $pageUrl      URL of the page where the survey was shown.
	 * @param  string|null  $deviceType   Device category: desktop | mobile | tablet.
	 * @param  bool         $consentGiven Whether the respondent gave explicit consent.
	 * @param  int          $userId       WordPress user ID (0 for guests).
	 * @param  string|null  $ipAddress    Raw IP address, null when privacy mode is active.
	 * @param  string|null  $guestToken   Persistent guest UUID for duplicate detection.
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly int $surveyId,
		public readonly array $responseData,
		public readonly ?float $score,
		public readonly ?string $pageUrl,
		public readonly ?string $deviceType,
		public readonly bool $consentGiven,
		public readonly int $userId,
		public readonly ?string $ipAddress = null,
		public readonly ?string $guestToken = null,
	) {}

	/**
	 * Build a ResponseDTO from a raw associative array.
	 *
	 * The userId is automatically populated from the current WordPress session.
	 *
	 * @param  int          $surveyId Resolved survey ID from the route.
	 * @param  array<mixed> $data     Raw request data.
	 * @return self
	 * @since  1.0.0
	 */
	public static function fromArray( int $surveyId, array $data ): self {
		$rawToken   = isset( $data['visitor_token'] ) ? sanitize_text_field( (string) $data['visitor_token'] ) : '';
		$guestToken = preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $rawToken )
			? $rawToken
			: null;

		return new self(
			surveyId: $surveyId,
			responseData: $data['response_data'] ?? [],
			score: isset( $data['score'] ) ? (float) $data['score'] : null,
			pageUrl: $data['page_url'] ?? null,
			deviceType: $data['device_type'] ?? null,
			consentGiven: ! empty( $data['consent_given'] ),
			userId: get_current_user_id(),
			guestToken: $guestToken,
		);
	}
}
