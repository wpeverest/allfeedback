<?php

declare(strict_types=1);

namespace AllFeedback\Core;

use AllFeedback\Core\Contracts\ServiceProviderInterface;
use AllFeedback\Infrastructure\Database\Migrator;
use AllFeedback\Traits\Hooks;

/**
 * Class CoreServiceProvider
 *
 * Responsible for bootstrapping core functionality:
 *  - Running database migrations on admin_init
 *  - Registering custom post types / taxonomies (add yours here)
 *  - Running activation tasks (migrations, role creation)
 *
 * Add more init hooks here as the plugin grows.
 */
class CoreServiceProvider implements ServiceProviderInterface {

	use Hooks;

	public function __construct(
		private readonly RoleManager $roleManager,
		private readonly Migrator $migrator,
	) {}

	/**
	 * Register WordPress hooks.
	 */
	public function boot(): void {
		// Run any pending database migrations on every admin page load.
		$this->addAction( 'admin_init', [ $this, 'runPendingMigrations' ] );

		// Hook into the plugin's own activation action (fired by Plugin::activate()).
		$this->addAction( 'rmb:activated', [ $this, 'onActivation' ] );

		// Register custom post types / taxonomies on 'init'.
		// $this->addAction( 'init', [ $this, 'registerPostTypes' ] );
	}

	/**
	 * Execute any migrations that have not been run yet.
	 */
	public function runPendingMigrations(): void {
		if ( $this->migrator->hasPending() ) {
			$this->migrator->run();
		}
	}

	/**
	 * Tasks to run on plugin activation.
	 * Fires after WordPress has loaded so the container is fully available.
	 */
	public function onActivation(): void {
		$this->migrator->run();
		$this->roleManager->createRoles();

		$this->doAction( 'rmb:activated:complete' );
	}

	// ------------------------------------------------------------------
	// Custom Post Types / Taxonomies (expand as needed)
	// ------------------------------------------------------------------

	// public function registerPostTypes(): void {
	//     register_post_type( 'allfb_item', [ /* args */ ] );
	// }
}
