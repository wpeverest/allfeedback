<?php

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
 * @since 1.0.0
 */
class SendNotificationJobPayload extends AbstractJobPayload {

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		public readonly string $notificationType = '',
		public readonly int $surveyId = 0,
		public readonly int $responseId = 0,
	) {}

	/**
	 * Reconstruct a payload from a serialised array.
	 *
	 * @param array<string, mixed> $data Serialised payload data.
	 * @since 1.0.0
	 */
	public static function fromArray( array $data ): self {
		return new self(
			notificationType: (string) ( $data['notificationType'] ?? '' ),
			surveyId: (int) ( $data['surveyId'] ?? 0 ),
			responseId: (int) ( $data['responseId'] ?? 0 ),
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
			'notificationType' => $this->notificationType,
			'surveyId'         => $this->surveyId,
			'responseId'       => $this->responseId,
		];
	}
}
