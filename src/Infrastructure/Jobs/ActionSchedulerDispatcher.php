<?php
/**
 * Action scheduler dispatcher.
 *
 * @package AllFeedback\Infrastructure\Jobs
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Jobs;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\Contracts\JobDispatcher;
use AllFeedback\Core\Jobs\Contracts\JobPayload;

/**
 * Action Scheduler-backed implementation of JobDispatcher.
 *
 * Encodes every job dispatch as a JSON string containing the job class name
 * and serialised payload, then delegates scheduling to WooCommerce's
 * Action Scheduler library via its `as_*` helper functions.
 *
 * This class assumes Action Scheduler is available. The DI container
 * (config/services.php) is responsible for selecting this implementation
 * only when Action Scheduler is loaded. Use SynchronousJobDispatcher
 * as the fallback when it is not.
 *
 * @package AllFeedback\Infrastructure\Jobs
 * @since   1.0.0
 */
class ActionSchedulerDispatcher implements JobDispatcher {

	/**
	 * Action Scheduler hook name for all plugin jobs.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const HOOK = 'allfeedback/run_job';

	/**
	 * Action Scheduler group name for all plugin jobs.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const GROUP = 'allfeedback';

	/**
	 * Dispatch a one-off job, optionally after a delay.
	 *
	 * @param  class-string $job_class Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @param  int          $delay    Seconds from now. 0 = run immediately.
	 * @return int The action ID assigned by Action Scheduler.
	 * @since  1.0.0
	 */
	public function dispatch( string $job_class, JobPayload $payload, int $delay = 0 ): int {
		return (int) as_schedule_single_action(
			time() + $delay,
			self::HOOK,
			[ $this->encode( $job_class, $payload ) ],
			self::GROUP
		);
	}

	/**
	 * Dispatch a job only if no identical pending action already exists.
	 *
	 * @param  class-string $job_class Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @param  int          $delay    Seconds from now.
	 * @return int The action ID.
	 * @since  1.0.0
	 */
	public function dispatchUnique( string $job_class, JobPayload $payload, int $delay = 0 ): int {
		return (int) as_schedule_single_action(
			time() + $delay,
			self::HOOK,
			[ $this->encode( $job_class, $payload ) ],
			self::GROUP,
			true
		);
	}

	/**
	 * Schedule a job to run at a specific Unix timestamp.
	 *
	 * @param  class-string $job_class  Fully-qualified job class name.
	 * @param  JobPayload   $payload   Typed payload instance.
	 * @param  int          $timestamp Unix timestamp for the run.
	 * @return int The action ID.
	 * @since  1.0.0
	 */
	public function scheduleAt( string $job_class, JobPayload $payload, int $timestamp ): int {
		return (int) as_schedule_single_action(
			$timestamp,
			self::HOOK,
			[ $this->encode( $job_class, $payload ) ],
			self::GROUP
		);
	}

	/**
	 * Schedule a recurring job.
	 *
	 * @param  class-string $job_class        Fully-qualified job class name.
	 * @param  JobPayload   $payload         Typed payload instance.
	 * @param  int          $interval_seconds How often (in seconds) the job should repeat.
	 * @param  int          $start_at         Unix timestamp for the first run. 0 = now.
	 * @return int The action ID.
	 * @since  1.0.0
	 */
	public function scheduleRecurring( string $job_class, JobPayload $payload, int $interval_seconds, int $start_at = 0 ): int {
		return (int) as_schedule_recurring_action(
			0 !== $start_at ? $start_at : time(),
			$interval_seconds,
			self::HOOK,
			[ $this->encode( $job_class, $payload ) ],
			self::GROUP
		);
	}

	/**
	 * Cancel all pending instances of this job with this payload.
	 *
	 * @param  class-string $job_class Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @return void
	 * @since  1.0.0
	 */
	public function cancel( string $job_class, JobPayload $payload ): void {
		as_unschedule_all_actions(
			self::HOOK,
			[ $this->encode( $job_class, $payload ) ],
			self::GROUP
		);
	}

	/**
	 * Return true when a pending instance of this job with this payload exists.
	 *
	 * @param  class-string $job_class Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @return bool
	 * @since  1.0.0
	 */
	public function isPending( string $job_class, JobPayload $payload ): bool {
		return (bool) as_has_scheduled_action(
			self::HOOK,
			[ $this->encode( $job_class, $payload ) ],
			self::GROUP
		);
	}

	/**
	 * JSON-encode the job class and payload for Action Scheduler storage.
	 *
	 * @param  string     $job_class Fully-qualified job class name.
	 * @param  JobPayload $payload  Typed payload instance.
	 * @return string JSON-encoded string containing class name and payload array.
	 * @since  1.0.0
	 */
	private function encode( string $job_class, JobPayload $payload ): string {
		return (string) wp_json_encode(
			[
				'class'   => $job_class,
				'payload' => $payload->toArray(),
			]
		);
	}
}
