<?php
/**
 * Synchronous job dispatcher.
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
 * Synchronous (in-process) implementation of JobDispatcher.
 *
 * Used as a fallback when the Action Scheduler library is not available
 * (e.g. no WooCommerce installed). Every dispatch fires the job immediately
 * in the current request via the same `allfeedback/run_job` hook that
 * ActionSchedulerRunner listens to — so no separate execution path is needed.
 *
 * Limitations vs the AS-backed dispatcher:
 *  - `$delay` and `$timestamp` are ignored; jobs always run immediately.
 *  - `scheduleRecurring` runs the job once; recurrence is not supported.
 *  - `cancel` and `isPending` are no-ops (nothing is enqueued).
 *
 * @package AllFeedback\Infrastructure\Jobs
 * @since   1.0.0
 */
class SynchronousJobDispatcher implements JobDispatcher {

	/**
	 * Dispatch a one-off job by running it immediately in the current request.
	 *
	 * @param  class-string $job_class Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @param  int          $delay    Ignored — synchronous dispatch has no delay.
	 * @return int Always returns 0 (no Action Scheduler action ID).
	 * @since  1.0.0
	 */
	public function dispatch( string $job_class, JobPayload $payload, int $delay = 0 ): int {
		do_action( ActionSchedulerRunner::HOOK, $this->encode( $job_class, $payload ) ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- constant hook
		return 0;
	}

	/**
	 * Dispatch a job immediately (deduplication is not available synchronously).
	 *
	 * @param  class-string $job_class Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @param  int          $delay    Ignored.
	 * @return int Always returns 0 (no Action Scheduler action ID).
	 * @since  1.0.0
	 */
	public function dispatchUnique( string $job_class, JobPayload $payload, int $delay = 0 ): int {
		do_action( ActionSchedulerRunner::HOOK, $this->encode( $job_class, $payload ) ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- constant hook
		return 0;
	}

	/**
	 * Dispatch a job immediately, ignoring the scheduled timestamp.
	 *
	 * @param  class-string $job_class  Fully-qualified job class name.
	 * @param  JobPayload   $payload   Typed payload instance.
	 * @param  int          $timestamp Ignored.
	 * @return int Always returns 0 (no Action Scheduler action ID).
	 * @since  1.0.0
	 */
	public function scheduleAt( string $job_class, JobPayload $payload, int $timestamp ): int {
		do_action( ActionSchedulerRunner::HOOK, $this->encode( $job_class, $payload ) ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- constant hook
		return 0;
	}

	/**
	 * Run the job once immediately. Recurring cadence is not supported without AS.
	 *
	 * @param  class-string $job_class        Fully-qualified job class name.
	 * @param  JobPayload   $payload         Typed payload instance.
	 * @param  int          $interval_seconds Ignored.
	 * @param  int          $start_at         Ignored.
	 * @return int Always returns 0 (no Action Scheduler action ID).
	 * @since  1.0.0
	 */
	public function scheduleRecurring( string $job_class, JobPayload $payload, int $interval_seconds, int $start_at = 0 ): int {
		do_action( ActionSchedulerRunner::HOOK, $this->encode( $job_class, $payload ) ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- constant hook
		return 0;
	}

	/**
	 * No-op — nothing is enqueued, so there is nothing to cancel.
	 *
	 * @param  class-string $job_class Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @return void
	 * @since  1.0.0
	 */
	public function cancel( string $job_class, JobPayload $payload ): void {}

	/**
	 * Always returns false — nothing is pending in the synchronous dispatcher.
	 *
	 * @param  class-string $job_class Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @return bool
	 * @since  1.0.0
	 */
	public function isPending( string $job_class, JobPayload $payload ): bool {
		return false;
	}

	/**
	 * JSON-encode the job class and payload for ActionSchedulerRunner consumption.
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
