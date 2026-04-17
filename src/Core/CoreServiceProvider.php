<?php

declare(strict_types=1);

namespace AllFeedback\Core;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Contracts\ServiceProviderInterface;
use AllFeedback\Infrastructure\Database\Migrator;
use AllFeedback\Support\Logger;
use AllFeedback\Traits\Hooks;

/**
 * Class CoreServiceProvider
 *
 * Bootstraps core plugin functionality:
 *  - Database migrations on admin_init
 *  - Custom post type and taxonomy registration on init
 *  - Role creation on plugin activation
 *
 * @since 1.0.0
 */
class CoreServiceProvider implements ServiceProviderInterface {

	use Hooks;

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly RoleManager $roleManager,
		private readonly Migrator $migrator,
		private readonly Logger $logger,
	) {}

	/**
	 * Register WordPress hooks.
	 *
	 * @since 1.0.0
	 */
	public function boot(): void {
		$this->logger->registerShutdownHandler();
		$this->addAction( 'admin_init', [ $this, 'runPendingMigrations' ] );
		$this->addAction( 'allfeedback:activated', [ $this, 'onActivation' ] );
	}

	/**
	 * Execute any migrations that have not been run yet.
	 *
	 * @since 1.0.0
	 */
	public function runPendingMigrations(): void {
		if ( $this->migrator->hasPending() ) {
			$this->migrator->run();
		}
	}

	/**
	 * Tasks to run on plugin activation.
	 *
	 * @since 1.0.0
	 */
	public function onActivation(): void {
		$this->migrator->resetIfTablesMissing( [ 'af_surveys', 'af_responses' ] );
		$this->migrator->run();
		$this->roleManager->createRoles();
		$this->logger->ensureDirectory();
		$this->doAction( 'allfeedback:activated:complete' );
	}

}
