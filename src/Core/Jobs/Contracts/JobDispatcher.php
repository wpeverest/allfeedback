<?php

declare(strict_types=1);

namespace AllFeedback\Core\Jobs\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Interface JobDispatcher
 *
 * Provides a high-level API for enqueuing background jobs through
 * Action Scheduler. All timing and deduplication strategies are expressed as
 * distinct methods so call-sites are explicit about their intent.
 *
 * @since 1.0.0
 */
interface JobDispatcher {

	/**
	 * Dispatch a one-off job, optionally after a delay.
	 *
	 * @param class-string<Job> $jobClass Fully-qualified job class.
	 * @param JobPayload        $payload  The payload to pass to the job.
	 * @param int               $delay    Seconds from now before the job should run. 0 = immediately.
	 * @return int The action ID assigned by Action Scheduler.
	 * @since 1.0.0
	 */
	public function dispatch( string $jobClass, JobPayload $payload, int $delay = 0 ): int;

	/**
	 * Dispatch a job only if no identical pending action already exists.
	 *
	 * @param class-string<Job> $jobClass
	 * @param JobPayload        $payload
	 * @param int               $delay    Seconds from now.
	 * @return int The action ID.
	 * @since 1.0.0
	 */
	public function dispatchUnique( string $jobClass, JobPayload $payload, int $delay = 0 ): int;

	/**
	 * Schedule a job to run at a specific Unix timestamp.
	 *
	 * @param class-string<Job> $jobClass
	 * @param JobPayload        $payload
	 * @param int               $timestamp Unix timestamp.
	 * @return int The action ID.
	 * @since 1.0.0
	 */
	public function scheduleAt( string $jobClass, JobPayload $payload, int $timestamp ): int;

	/**
	 * Schedule a recurring job.
	 *
	 * @param class-string<Job> $jobClass
	 * @param JobPayload        $payload
	 * @param int               $intervalSeconds How often (in seconds) the job should repeat.
	 * @param int               $startAt         Unix timestamp for the first run. 0 = now.
	 * @return int The action ID.
	 * @since 1.0.0
	 */
	public function scheduleRecurring( string $jobClass, JobPayload $payload, int $intervalSeconds, int $startAt = 0 ): int;

	/**
	 * Cancel all pending instances of this job with this payload.
	 *
	 * @param class-string<Job> $jobClass
	 * @param JobPayload        $payload
	 * @since 1.0.0
	 */
	public function cancel( string $jobClass, JobPayload $payload ): void;

	/**
	 * Check whether a pending instance of this job with this payload exists.
	 *
	 * @param class-string<Job> $jobClass
	 * @param JobPayload        $payload
	 * @return bool
	 * @since 1.0.0
	 */
	public function isPending( string $jobClass, JobPayload $payload ): bool;
}
