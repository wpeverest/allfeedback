<?php
/**
 * Send weekly digest job.
 *
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\AbstractJob;
use AllFeedback\Core\Jobs\AbstractJobPayload;
use AllFeedback\Infrastructure\Mail\Notifications\WeeklyDigestNotification;

/**
 * Background job that sends the weekly response-stats digest email.
 *
 * Scheduled as a recurring Action Scheduler action (every 7 days) by
 * NotificationServiceProvider::scheduleWeeklyDigest().
 *
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */
class SendWeeklyDigestJob extends AbstractJob {

	/**
	 * Constructor.
	 *
	 * @param  WeeklyDigestNotification $notification Weekly digest notification handler.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly WeeklyDigestNotification $notification,
	) {}

	/**
	 * Execute the job — send the weekly digest email.
	 *
	 * @param  AbstractJobPayload $payload Empty payload (no entity IDs needed for site-wide digest).
	 * @return void
	 * @since  1.0.0
	 */
	public function handle( AbstractJobPayload $payload ): void {
		$this->notification->send();
	}

	/**
	 * Reconstruct a typed payload from a serialised array.
	 *
	 * @param  array<string, mixed> $data Serialised payload data.
	 * @return SendWeeklyDigestJobPayload
	 * @since  1.0.0
	 */
	public static function payloadFromArray( array $data ): SendWeeklyDigestJobPayload {
		return SendWeeklyDigestJobPayload::fromArray( $data );
	}
}
