<?php

declare(strict_types=1);

namespace AllFeedback\Core\Jobs;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Jobs\ActionSchedulerRunner;
use AllFeedback\Core\Contracts\ServiceProviderInterface;
use AllFeedback\Traits\Hooks;

/**
 * Class JobServiceProvider
 *
 * Bootstraps the background job infrastructure for the AllFeedback plugin.
 * Loads the Action Scheduler library when it is bundled with the plugin and
 * registers the job runner hook. Also triggers any post-activation migration
 * required by Action Scheduler.
 *
 * @since 1.0.0
 */
class JobServiceProvider implements ServiceProviderInterface {

	use Hooks;

	/**
	 * @param ActionSchedulerRunner $runner The job runner that listens for the run hook.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly ActionSchedulerRunner $runner,
	) {}

	/**
	 * Boot the job infrastructure: load Action Scheduler, register the runner,
	 * and hook into the plugin activation event.
	 *
	 * @since 1.0.0
	 */
	public function boot(): void {
		$this->initActionScheduler();
		$this->runner->register();
		$this->addAction( 'allfeedback:activated', [ $this, 'onActivation' ] );
	}

	/**
	 * Require the bundled Action Scheduler bootstrap file when the library is
	 * not already loaded by another plugin.
	 *
	 * @since 1.0.0
	 */
	private function initActionScheduler(): void {
		$bootstrap = dirname( __DIR__, 3 ) . '/vendor/woocommerce/action-scheduler/action-scheduler.php';

		if ( file_exists( $bootstrap ) && ! function_exists( 'as_schedule_single_action' ) ) {
			require_once $bootstrap;
		}
	}

	/**
	 * Run any pending Action Scheduler database migrations after plugin activation.
	 *
	 * @since 1.0.0
	 */
	public function onActivation(): void {
		if ( class_exists( \ActionScheduler_DBStoreMigrator::class ) ) {
			// \ActionScheduler_DBStoreMigrator::migrate();
		}
	}
}
