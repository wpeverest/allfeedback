<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Contracts\ServiceProviderInterface;
use AllFeedback\Core\Jobs\Contracts\JobDispatcher;
use AllFeedback\Domain\Response\Response;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Traits\Hooks;

/**
 * Wires WordPress action hooks to async notification jobs.
 *
 * Listened hooks → dispatched jobs:
 *   - `allfeedback:response:submitted`  → new_response_alert
 *   - `allfeedback:survey:activated`    → survey_published
 *   - `init`                            → scheduleWeeklyDigest (idempotent, AS-only)
 *
 * Jobs are dispatched via the configured {@see JobDispatcher}. When Action
 * Scheduler is available emails are sent in the background; otherwise they are
 * sent synchronously in-process.
 *
 * To register additional notification types from a Pro add-on, hook into
 * `allfeedback:response:submitted` directly instead of modifying this class.
 *
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */
class NotificationServiceProvider implements ServiceProviderInterface {

	use Hooks;

	/**
	 * WordPress option key used to record that a single recurring digest action
	 * has already been registered in Action Scheduler.
	 *
	 * Storing this in wp_options prevents re-scheduling on every page load and
	 * avoids a race condition where `isPending()` returns false while the job is
	 * currently in-progress (AS status "in-progress" ≠ "pending").
	 *
	 * @since 1.0.0
	 */
	private const DIGEST_SCHEDULED_OPTION = 'allfeedback_digest_scheduled';

	/**
	 * @param  JobDispatcher $dispatcher Background job dispatcher.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly JobDispatcher $dispatcher,
	) {}

	/**
	 * Register WordPress action hooks.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function boot(): void {
		$this->addAction( 'allfeedback:response:submitted', [ $this, 'onResponseSubmitted' ] );
		$this->addAction( 'allfeedback:survey:activated',   [ $this, 'onSurveyActivated' ] );
		$this->addAction( 'init',                           [ $this, 'scheduleWeeklyDigest' ] );
	}

	/**
	 * Queue the admin alert job when a response is submitted.
	 *
	 * @param  Response $response Newly submitted response aggregate.
	 * @return void
	 * @since  1.0.0
	 */
	public function onResponseSubmitted( Response $response ): void {
		$this->dispatcher->dispatch(
			SendNotificationJob::class,
			new SendNotificationJobPayload(
				notificationType: 'new_response_alert',
				surveyId:         $response->getSurveyId(),
				responseId:       (int) $response->getId(),
			)
		);
	}

	/**
	 * Queue a survey-published notification when a survey is activated.
	 *
	 * @param  Survey $survey The survey that transitioned to the active state.
	 * @return void
	 * @since  1.0.0
	 */
	public function onSurveyActivated( Survey $survey ): void {
		$surveyId = (int) $survey->getId();
		if ( $surveyId <= 0 ) {
			return;
		}

		$this->dispatcher->dispatch(
			SendNotificationJob::class,
			new SendNotificationJobPayload(
				notificationType: 'survey_published',
				surveyId:         $surveyId,
			)
		);
	}

	/**
	 * Register the weekly digest as a single recurring Action Scheduler job.
	 *
	 * Only runs when Action Scheduler is available — skipped silently otherwise.
	 *
	 * Uses a wp_options flag rather than isPending() to guard against a race
	 * condition: when AS runs the digest job in-process (during the same request),
	 * the action status changes from "pending" to "in-progress". isPending() uses
	 * as_has_scheduled_action() which only matches "pending" status, so it briefly
	 * returns false and a duplicate recurring action would be created. The option
	 * flag is set once and persists across requests, preventing that entirely.
	 *
	 * On the first call:
	 *   1. Cancel any stale/duplicate recurring actions already in the AS queue.
	 *   2. Schedule exactly one new recurring action (weekly, from next Monday 08:00).
	 *   3. Persist the option flag so subsequent calls skip immediately.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function scheduleWeeklyDigest(): void {
		if ( ! function_exists( 'as_schedule_recurring_action' ) ) {
			return;
		}

		// Fast-path: option set → a clean recurring action is already registered.
		if ( get_option( self::DIGEST_SCHEDULED_OPTION ) ) {
			return;
		}

		$payload = new SendWeeklyDigestJobPayload();

		// Cancel any duplicates created before this guard was in place.
		$this->dispatcher->cancel( SendWeeklyDigestJob::class, $payload );

		$timezone   = wp_timezone();
		$nextMonday = new \DateTimeImmutable( 'next Monday 08:00:00', $timezone );

		$this->dispatcher->scheduleRecurring(
			SendWeeklyDigestJob::class,
			$payload,
			604800,
			$nextMonday->getTimestamp()
		);

		update_option( self::DIGEST_SCHEDULED_OPTION, true, false );
	}
}
