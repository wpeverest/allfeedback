<?php
/**
 * Responsedto.
 *
 * @package AllFeedback\Application\Response
 * @since   1.0.0
 */

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
	 * Constructor.
	 *
	 * @param  int          $survey_id     Survey primary key.
	 * @param  array<mixed> $response_data Raw key/value payload from the respondent.
	 * @param  float|null   $score        Optional numeric score.
	 * @param  string|null  $page_url      URL of the page where the survey was shown.
	 * @param  string|null  $device_type   Device category: desktop | mobile | tablet.
	 * @param  bool         $consent_given Whether the respondent gave explicit consent.
	 * @param  int          $user_id       WordPress user ID (0 for guests).
	 * @param  string|null  $ip_address    Raw IP address, null when privacy mode is active.
	 * @param  string|null  $guest_token   Persistent guest UUID for duplicate detection.
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly int $survey_id,
		public readonly array $response_data,
		public readonly ?float $score,
		public readonly ?string $page_url,
		public readonly ?string $device_type,
		public readonly bool $consent_given,
		public readonly int $user_id,
		public readonly ?string $ip_address = null,
		public readonly ?string $guest_token = null,
	) {}

	/**
	 * Build a ResponseDTO from a raw associative array.
	 *
	 * The userId is automatically populated from the current WordPress session.
	 *
	 * @param  int          $survey_id Resolved survey ID from the route.
	 * @param  array<mixed> $data     Raw request data.
	 * @return self
	 * @since  1.0.0
	 */
	public static function fromArray( int $survey_id, array $data ): self {
		$raw_token   = isset( $data['visitor_token'] ) ? sanitize_text_field( (string) $data['visitor_token'] ) : '';
		$guest_token = preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $raw_token )
			? $raw_token
			: null;

		$raw_url  = isset( $data['page_url'] ) ? (string) $data['page_url'] : '';
		$page_url = null;
		if ( $raw_url !== '' ) {
			$scheme   = wp_parse_url( $raw_url, PHP_URL_SCHEME );
			$page_url = ( filter_var( $raw_url, FILTER_VALIDATE_URL ) && in_array( $scheme, [ 'http', 'https' ], true ) )
				? esc_url_raw( $raw_url )
				: null;
		}

		return new self(
			survey_id: $survey_id,
			response_data: $data['response_data'] ?? [],
			score: isset( $data['score'] ) ? (float) $data['score'] : null,
			page_url: $page_url,
			device_type: $data['device_type'] ?? null,
			consent_given: ! empty( $data['consent_given'] ),
			user_id: get_current_user_id(),
			guest_token: $guest_token,
		);
	}
}
