<?php
/**
 * Send notification job payload.
 *
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\AbstractJobPayload;

/**
 * Payload value object for SendNotificationJob.
 *
 * Carries the notification type and the identifiers needed to reconstruct
 * the domain objects required by each notification class.
 *
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */
class SendNotificationJobPayload extends AbstractJobPayload {

	/**
	 * Constructor.
	 *
	 * @param  string $notification_type Notification type identifier (e.g. `new_response_alert`).
	 * @param  int    $survey_id         Survey primary key.
	 * @param  int    $response_id       Response primary key (0 for survey-only notifications).
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly string $notification_type = '',
		public readonly int $survey_id = 0,
		public readonly int $response_id = 0,
	) {}

	/**
	 * Reconstruct a payload from a serialised array.
	 *
	 * @param  array<string, mixed> $data Serialised payload data.
	 * @return self
	 * @since  1.0.0
	 */
	public static function fromArray( array $data ): self {
		return new self(
			notification_type: (string) ( $data['notificationType'] ?? '' ),
			survey_id: (int) ( $data['surveyId'] ?? 0 ),
			response_id: (int) ( $data['responseId'] ?? 0 ),
		);
	}

	/**
	 * Serialise the payload to a plain array for Action Scheduler storage.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function toArray(): array {
		return [
			'notificationType' => $this->notification_type,
			'surveyId'         => $this->survey_id,
			'responseId'       => $this->response_id,
		];
	}
}
