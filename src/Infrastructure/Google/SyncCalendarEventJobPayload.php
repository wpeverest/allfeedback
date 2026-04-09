<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Google;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\AbstractJobPayload;

/**
 * Payload for SyncCalendarEventJob.
 *
 * Carries the sync action ('create', 'update', or 'delete'), the WordPress user
 * ID that owns the calendar, and an arbitrary reference ID identifying the
 * domain object to sync (e.g. a future survey schedule).
 *
 * @since 1.0.0
 */
class SyncCalendarEventJobPayload extends AbstractJobPayload {

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		public readonly string $action = 'create',
		public readonly int $userId = 0,
		public readonly int $referenceId = 0,
	) {}

	/**
	 * Reconstruct a payload from a serialised array.
	 *
	 * @param array<string, mixed> $data Serialised payload data.
	 * @since 1.0.0
	 */
	public static function fromArray( array $data ): self {
		return new self(
			action: (string) ( $data['action'] ?? 'create' ),
			userId: (int) ( $data['userId'] ?? 0 ),
			referenceId: (int) ( $data['referenceId'] ?? 0 ),
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
			'action'      => $this->action,
			'userId'      => $this->userId,
			'referenceId' => $this->referenceId,
		];
	}
}
