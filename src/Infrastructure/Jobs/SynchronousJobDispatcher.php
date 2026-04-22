<?php

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
	 * @param  class-string $jobClass Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @param  int          $delay    Ignored — synchronous dispatch has no delay.
	 * @return int Always returns 0 (no Action Scheduler action ID).
	 * @since  1.0.0
	 */
	public function dispatch( string $jobClass, JobPayload $payload, int $delay = 0 ): int {
		do_action( ActionSchedulerRunner::HOOK, $this->encode( $jobClass, $payload ) );
		return 0;
	}

	/**
	 * Dispatch a job immediately (deduplication is not available synchronously).
	 *
	 * @param  class-string $jobClass Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @param  int          $delay    Ignored.
	 * @return int Always returns 0 (no Action Scheduler action ID).
	 * @since  1.0.0
	 */
	public function dispatchUnique( string $jobClass, JobPayload $payload, int $delay = 0 ): int {
		do_action( ActionSchedulerRunner::HOOK, $this->encode( $jobClass, $payload ) );
		return 0;
	}

	/**
	 * Dispatch a job immediately, ignoring the scheduled timestamp.
	 *
	 * @param  class-string $jobClass  Fully-qualified job class name.
	 * @param  JobPayload   $payload   Typed payload instance.
	 * @param  int          $timestamp Ignored.
	 * @return int Always returns 0 (no Action Scheduler action ID).
	 * @since  1.0.0
	 */
	public function scheduleAt( string $jobClass, JobPayload $payload, int $timestamp ): int {
		do_action( ActionSchedulerRunner::HOOK, $this->encode( $jobClass, $payload ) );
		return 0;
	}

	/**
	 * Run the job once immediately. Recurring cadence is not supported without AS.
	 *
	 * @param  class-string $jobClass        Fully-qualified job class name.
	 * @param  JobPayload   $payload         Typed payload instance.
	 * @param  int          $intervalSeconds Ignored.
	 * @param  int          $startAt         Ignored.
	 * @return int Always returns 0 (no Action Scheduler action ID).
	 * @since  1.0.0
	 */
	public function scheduleRecurring( string $jobClass, JobPayload $payload, int $intervalSeconds, int $startAt = 0 ): int {
		do_action( ActionSchedulerRunner::HOOK, $this->encode( $jobClass, $payload ) );
		return 0;
	}

	/**
	 * No-op — nothing is enqueued, so there is nothing to cancel.
	 *
	 * @param  class-string $jobClass Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @return void
	 * @since  1.0.0
	 */
	public function cancel( string $jobClass, JobPayload $payload ): void {}

	/**
	 * Always returns false — nothing is pending in the synchronous dispatcher.
	 *
	 * @param  class-string $jobClass Fully-qualified job class name.
	 * @param  JobPayload   $payload  Typed payload instance.
	 * @return bool
	 * @since  1.0.0
	 */
	public function isPending( string $jobClass, JobPayload $payload ): bool {
		return false;
	}

	/**
	 * JSON-encode the job class and payload for ActionSchedulerRunner consumption.
	 *
	 * @param  string     $jobClass Fully-qualified job class name.
	 * @param  JobPayload $payload  Typed payload instance.
	 * @return string JSON-encoded string containing class name and payload array.
	 * @since  1.0.0
	 */
	private function encode( string $jobClass, JobPayload $payload ): string {
		return (string) wp_json_encode(
			[
				'class'   => $jobClass,
				'payload' => $payload->toArray(),
			]
		);
	}
}
