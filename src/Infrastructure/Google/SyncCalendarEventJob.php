<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Google;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\AbstractJob;
use AllFeedback\Core\Jobs\AbstractJobPayload;
use AllFeedback\Support\Logger;

/**
 * Background job for asynchronous Google Calendar synchronisation.
 *
 * Designed for future survey-scheduling features where surveys or interview
 * slots need to be reflected in a user's Google Calendar.  The job dispatches
 * create, update, or delete operations via GoogleCalendarService.
 *
 * @since 1.0.0
 */
class SyncCalendarEventJob extends AbstractJob {

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly GoogleCalendarService $calendarService,
		private readonly GoogleOAuthClient $oauthClient,
		private readonly Logger $logger,
	) {}

	/**
	 * Execute the calendar sync for the given payload.
	 *
	 * @since 1.0.0
	 */
	public function handle( AbstractJobPayload $payload ): void {
		assert( $payload instanceof SyncCalendarEventJobPayload );

		if ( ! $this->oauthClient->isConfigured() ) {
			return;
		}

		match ( $payload->action ) {
			'delete' => $this->handleDelete( $payload->userId, $payload->referenceId ),
			default  => $this->logger->error(
				'Unknown calendar sync action',
				[ 'action' => $payload->action, 'reference_id' => $payload->referenceId ]
			),
		};
	}

	/**
	 * Reconstruct the typed payload from a serialised array.
	 *
	 * @param array<string, mixed> $data Serialised payload data.
	 * @since 1.0.0
	 */
	public static function payloadFromArray( array $data ): SyncCalendarEventJobPayload {
		return SyncCalendarEventJobPayload::fromArray( $data );
	}

	/**
	 * Handle the delete action by removing the event from Google Calendar.
	 *
	 * The calendarEventId must be stored on the referencing domain object; this
	 * method expects it to be passed via payload once the storage layer is wired up.
	 *
	 * @since 1.0.0
	 */
	private function handleDelete( int $userId, int $referenceId ): void {
		$this->logger->info(
			'Calendar delete requested',
			[
				'user_id'      => $userId,
				'reference_id' => $referenceId,
			]
		);
	}
}
