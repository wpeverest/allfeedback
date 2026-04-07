<?php

declare(strict_types=1);

namespace AllFeedback\Domain\FormSubmission;

defined( 'ABSPATH' ) || exit;

/**
 * Class FormSubmission
 *
 * Represents a single respondent's completed form submission.
 * The answers map is keyed by field ID (int cast to string) and the value
 * is whatever the respondent supplied — a scalar for simple fields, an
 * array for multi-select fields.
 *
 * @package AllFeedback\Domain\FormSubmission
 * @since   1.0.0
 */
class FormSubmission {

	/**
	 * @param int                        $id          Surrogate primary key (0 for new, unsaved submissions).
	 * @param int                        $formId      Parent form ID.
	 * @param array<string, mixed>       $answers     Field-ID → answer map.
	 * @param int                        $respondentId WP user ID of the respondent (0 for anonymous).
	 * @param string                     $ipAddress   Respondent IP address (empty when not collected).
	 * @param string                     $userAgent   Respondent browser user-agent string.
	 * @param \DateTimeImmutable         $submittedAt Submission timestamp.
	 */
	public function __construct(
		private int $id,
		private int $formId,
		private array $answers       = [],
		private int $respondentId    = 0,
		private string $ipAddress    = '',
		private string $userAgent    = '',
		private \DateTimeImmutable $submittedAt = new \DateTimeImmutable(),
	) {}

	// ------------------------------------------------------------------
	// Accessors
	// ------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 */
	public function getId(): int {
		return $this->id;
	}

	/**
	 * @since 1.0.0
	 */
	public function getFormId(): int {
		return $this->formId;
	}

	/**
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function getAnswers(): array {
		return $this->answers;
	}

	/**
	 * Return the answer for a specific field, or null if not present.
	 *
	 * @param int $fieldId Form field primary key.
	 * @return mixed|null
	 * @since 1.0.0
	 */
	public function getAnswer( int $fieldId ): mixed {
		return $this->answers[ (string) $fieldId ] ?? null;
	}

	/**
	 * @since 1.0.0
	 */
	public function getRespondentId(): int {
		return $this->respondentId;
	}

	/**
	 * @since 1.0.0
	 */
	public function getIpAddress(): string {
		return $this->ipAddress;
	}

	/**
	 * @since 1.0.0
	 */
	public function getUserAgent(): string {
		return $this->userAgent;
	}

	/**
	 * @since 1.0.0
	 */
	public function getSubmittedAt(): \DateTimeImmutable {
		return $this->submittedAt;
	}

	/**
	 * Whether the submission was made by an anonymous (non-logged-in) user.
	 *
	 * @since 1.0.0
	 */
	public function isAnonymous(): bool {
		return $this->respondentId === 0;
	}
}
