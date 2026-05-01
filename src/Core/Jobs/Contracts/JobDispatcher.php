<?php
/**
 * Job dispatcher.
 *
 * @package AllFeedback\Core\Jobs\Contracts
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Core\Jobs\Contracts;

defined( 'ABSPATH' ) || exit;

// phpcs:disable Squiz.Commenting.FunctionComment.IncorrectTypeHint -- class-string<Job> is intentionally more specific than PHP's plain string type hint

/**
 * Interface JobDispatcher
 *
 * Provides a high-level API for enqueuing background jobs through
 * Action Scheduler. All timing and deduplication strategies are expressed as
 * distinct methods so call-sites are explicit about their intent.
 *
 * @package AllFeedback\Core\Jobs\Contracts
 * @since   1.0.0
 */
interface JobDispatcher {

	/**
	 * Dispatch a one-off job, optionally after a delay.
	 *
	 * @param  class-string<Job> $job_class Fully-qualified job class.
	 * @param  JobPayload        $payload  The payload to pass to the job.
	 * @param  int               $delay    Seconds from now before the job should run. 0 = immediately.
	 * @return int The action ID assigned by Action Scheduler.
	 * @since  1.0.0
	 */
	public function dispatch( string $job_class, JobPayload $payload, int $delay = 0 ): int;

	/**
	 * Dispatch a job only if no identical pending action already exists.
	 *
	 * @param  class-string<Job> $job_class Fully-qualified job class.
	 * @param  JobPayload        $payload  The payload to pass to the job.
	 * @param  int               $delay    Seconds from now.
	 * @return int The action ID.
	 * @since  1.0.0
	 */
	public function dispatchUnique( string $job_class, JobPayload $payload, int $delay = 0 ): int;

	/**
	 * Schedule a job to run at a specific Unix timestamp.
	 *
	 * @param  class-string<Job> $job_class  Fully-qualified job class.
	 * @param  JobPayload        $payload   The payload to pass to the job.
	 * @param  int               $timestamp Unix timestamp.
	 * @return int The action ID.
	 * @since  1.0.0
	 */
	public function scheduleAt( string $job_class, JobPayload $payload, int $timestamp ): int;

	/**
	 * Schedule a recurring job.
	 *
	 * @param  class-string<Job> $job_class         Fully-qualified job class.
	 * @param  JobPayload        $payload           The payload to pass to the job.
	 * @param  int               $interval_seconds   How often (in seconds) the job should repeat.
	 * @param  int               $start_at           Unix timestamp for the first run. 0 = now.
	 * @return int The action ID.
	 * @since  1.0.0
	 */
	public function scheduleRecurring( string $job_class, JobPayload $payload, int $interval_seconds, int $start_at = 0 ): int;

	/**
	 * Cancel all pending instances of this job with this payload.
	 *
	 * @param  class-string<Job> $job_class Fully-qualified job class.
	 * @param  JobPayload        $payload  The payload to pass to the job.
	 * @return void
	 * @since  1.0.0
	 */
	public function cancel( string $job_class, JobPayload $payload ): void;

	/**
	 * Check whether a pending instance of this job with this payload exists.
	 *
	 * @param  class-string<Job> $job_class Fully-qualified job class.
	 * @param  JobPayload        $payload  The payload to pass to the job.
	 * @return bool
	 * @since  1.0.0
	 */
	public function isPending( string $job_class, JobPayload $payload ): bool;
}
