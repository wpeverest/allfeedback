<?php

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
 * @since 1.0.0
 */
class ActionSchedulerDispatcher implements JobDispatcher {

	/** @since 1.0.0 */
	private const HOOK  = 'allfeedback/run_job';

	/** @since 1.0.0 */
	private const GROUP = 'allfeedback';

	/**
	 * Dispatch a one-off job, optionally after a delay.
	 *
	 * @param class-string $jobClass Fully-qualified job class name.
	 * @param JobPayload   $payload  Typed payload instance.
	 * @param int          $delay    Seconds from now. 0 = run immediately.
	 * @since 1.0.0
	 */
	public function dispatch( string $jobClass, JobPayload $payload, int $delay = 0 ): int {
		return (int) as_schedule_single_action(
			time() + $delay,
			self::HOOK,
			[ $this->encode( $jobClass, $payload ) ],
			self::GROUP
		);
	}

	/**
	 * Dispatch a job only if no identical pending action already exists.
	 *
	 * @param class-string $jobClass
	 * @param JobPayload   $payload
	 * @param int          $delay    Seconds from now.
	 * @since 1.0.0
	 */
	public function dispatchUnique( string $jobClass, JobPayload $payload, int $delay = 0 ): int {
		return (int) as_schedule_single_action(
			time() + $delay,
			self::HOOK,
			[ $this->encode( $jobClass, $payload ) ],
			self::GROUP,
			true
		);
	}

	/**
	 * Schedule a job to run at a specific Unix timestamp.
	 *
	 * @param class-string $jobClass
	 * @param JobPayload   $payload
	 * @param int          $timestamp Unix timestamp for the run.
	 * @since 1.0.0
	 */
	public function scheduleAt( string $jobClass, JobPayload $payload, int $timestamp ): int {
		return (int) as_schedule_single_action(
			$timestamp,
			self::HOOK,
			[ $this->encode( $jobClass, $payload ) ],
			self::GROUP
		);
	}

	/**
	 * Schedule a recurring job.
	 *
	 * @param class-string $jobClass
	 * @param JobPayload   $payload
	 * @param int          $intervalSeconds How often (in seconds) the job should repeat.
	 * @param int          $startAt         Unix timestamp for the first run. 0 = now.
	 * @since 1.0.0
	 */
	public function scheduleRecurring( string $jobClass, JobPayload $payload, int $intervalSeconds, int $startAt = 0 ): int {
		return (int) as_schedule_recurring_action(
			$startAt ?: time(),
			$intervalSeconds,
			self::HOOK,
			[ $this->encode( $jobClass, $payload ) ],
			self::GROUP
		);
	}

	/**
	 * Cancel all pending instances of this job with this payload.
	 *
	 * @param class-string $jobClass
	 * @param JobPayload   $payload
	 * @since 1.0.0
	 */
	public function cancel( string $jobClass, JobPayload $payload ): void {
		as_unschedule_all_actions(
			self::HOOK,
			[ $this->encode( $jobClass, $payload ) ],
			self::GROUP
		);
	}

	/**
	 * Return true when a pending instance of this job with this payload exists.
	 *
	 * @param class-string $jobClass
	 * @param JobPayload   $payload
	 * @since 1.0.0
	 */
	public function isPending( string $jobClass, JobPayload $payload ): bool {
		return (bool) as_has_scheduled_action(
			self::HOOK,
			[ $this->encode( $jobClass, $payload ) ],
			self::GROUP
		);
	}

	/**
	 * JSON-encode the job class and payload for Action Scheduler storage.
	 *
	 * @since 1.0.0
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
