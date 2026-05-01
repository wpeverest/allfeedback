<?php
/**
 * Action scheduler runner.
 *
 * @package AllFeedback\Infrastructure\Jobs
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Jobs;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\Contracts\Job;
use AllFeedback\Support\Logger;
use AllFeedback\Traits\Hooks;
use Psr\Container\ContainerInterface;

/**
 * Registers the Action Scheduler hook and executes queued jobs.
 *
 * When Action Scheduler fires the `allfeedback/run_job` hook this class
 * decodes the serialised job data, resolves the job class from the DI container,
 * reconstructs the typed payload, and delegates to Job::handle().
 *
 * Any uncaught exception is logged and re-thrown so that Action Scheduler
 * records the action as failed rather than silently swallowing the error.
 *
 * @package AllFeedback\Infrastructure\Jobs
 * @since   1.0.0
 */
class ActionSchedulerRunner {

	use Hooks;

	/**
	 * Action Scheduler hook name consumed by this runner.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	public const HOOK = 'allfeedback/run_job';

	/**
	 * Constructor.
	 *
	 * @param  ContainerInterface $container DI container used to resolve job instances.
	 * @param  Logger             $logger    Logger for recording malformed or failed jobs.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly ContainerInterface $container,
		private readonly Logger $logger,
	) {}

	/**
	 * Register the Action Scheduler callback hook.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function register(): void {
		$this->addAction( self::HOOK, [ $this, 'run' ] );
	}

	/**
	 * Decode the job data, resolve the class, and execute the job.
	 *
	 * @param  string $job_data JSON-encoded job class and payload from Action Scheduler.
	 * @return void
	 * @throws \Throwable If the job itself throws.
	 * @since  1.0.0
	 */
	public function run( string $job_data ): void {
		$data = json_decode( $job_data, true );

		if ( ! is_array( $data ) || empty( $data['class'] ) ) {
			$this->logger->error(
				'AllFeedback JobRunner: received malformed job data.',
				[ 'data' => $job_data ]
			);
			return;
		}

		$class        = $data['class'];
		$payload_data = $data['payload'] ?? [];

		if ( ! class_exists( $class ) ) {
			$this->logger->error(
				"AllFeedback JobRunner: job class [{$class}] not found."
			);
			return;
		}

		if ( ! is_subclass_of( $class, Job::class ) ) {
			$this->logger->error(
				"AllFeedback JobRunner: [{$class}] does not implement Job interface."
			);
			return;
		}

		try {
			/** @var Job $job */
			$job     = $this->container->get( $class );
			$payload = $class::payloadFromArray( $payload_data );
			$job->handle( $payload );
		} catch ( \Throwable $e ) {
			$this->logger->error(
				"AllFeedback JobRunner: job [{$class}] threw an exception.",
				[
					'message' => $e->getMessage(),
					'file'    => $e->getFile(),
					'line'    => $e->getLine(),
				]
			);

			throw $e;
		}
	}
}
