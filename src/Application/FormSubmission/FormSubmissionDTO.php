<?php

declare(strict_types=1);

namespace AllFeedback\Application\FormSubmission;

defined( 'ABSPATH' ) || exit;

/**
 * Class FormSubmissionDTO
 *
 * Immutable data-transfer object that carries a respondent's answers from
 * the REST layer into the application services.  The answers map is keyed
 * by field ID (string representation of the integer primary key) and the
 * values are already sanitised by the controller before construction.
 *
 * @package AllFeedback\Application\FormSubmission
 * @since   1.0.0
 */
final class FormSubmissionDTO {

	/**
	 * @param int                  $formId       Parent form primary key.
	 * @param array<string, mixed> $answers      Field-ID → answer map.
	 * @param int                  $respondentId WP user ID (0 for anonymous).
	 * @param string               $ipAddress    Respondent IP (empty when not collected).
	 * @param string               $userAgent    Browser user-agent string.
	 */
	public function __construct(
		public readonly int $formId,
		public readonly array $answers      = [],
		public readonly int $respondentId   = 0,
		public readonly string $ipAddress   = '',
		public readonly string $userAgent   = '',
	) {}

	/**
	 * Build a FormSubmissionDTO from a raw (already sanitised) request parameter array.
	 *
	 * @param int                  $formId Parent form primary key resolved from the route.
	 * @param array<string, mixed> $data   Sanitised request data.
	 * @return static
	 * @since 1.0.0
	 */
	public static function fromArray( int $formId, array $data ): static {
		return new static(
			formId:       $formId,
			answers:      (array) ( $data['answers'] ?? [] ),
			respondentId: (int) ( $data['respondent_id'] ?? get_current_user_id() ),
			ipAddress:    sanitize_text_field( (string) ( $data['ip_address'] ?? '' ) ),
			userAgent:    sanitize_text_field( (string) ( $data['user_agent'] ?? '' ) ),
		);
	}
}
