<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Google;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Contracts\ServiceProviderInterface;
use AllFeedback\Core\Jobs\Contracts\JobDispatcher;
use AllFeedback\Support\Logger;
use AllFeedback\Traits\Hooks;

/**
 * Service provider that boots Google Calendar integration.
 *
 * Currently a stub.  When survey scheduling features are added this provider
 * will listen to domain events (e.g. `allfeedback:survey:scheduled`) and
 * dispatch SyncCalendarEventJob instances via the job dispatcher.
 *
 * @since 1.0.0
 */
class GoogleIntegrationProvider implements ServiceProviderInterface {

	use Hooks;

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly JobDispatcher $dispatcher,
		private readonly GoogleCalendarService $calendarService,
		private readonly GoogleOAuthClient $oauthClient,
		private readonly Logger $logger,
	) {}

	/**
	 * Register WordPress hooks for Google Calendar integration.
	 *
	 * @since 1.0.0
	 */
	public function boot(): void {
		if ( ! $this->oauthClient->isConfigured() ) {
			return;
		}

		$this->addAction( 'allfeedback:calendar:sync_requested', [ $this, 'onCalendarSyncRequested' ] );
	}

	/**
	 * Enqueue a calendar sync job when a sync is explicitly requested.
	 *
	 * @param int    $userId      WordPress user ID that owns the calendar.
	 * @param string $action      Sync action: 'create', 'update', or 'delete'.
	 * @param int    $referenceId Domain object ID (e.g. a future survey schedule ID).
	 * @since 1.0.0
	 */
	public function onCalendarSyncRequested( int $userId, string $action, int $referenceId ): void {
		$this->dispatcher->dispatch(
			SyncCalendarEventJob::class,
			new SyncCalendarEventJobPayload(
				action: $action,
				userId: $userId,
				referenceId: $referenceId,
			)
		);

		$this->logger->info(
			'Calendar sync job enqueued',
			[
				'action'       => $action,
				'user_id'      => $userId,
				'reference_id' => $referenceId,
			]
		);
	}
}
