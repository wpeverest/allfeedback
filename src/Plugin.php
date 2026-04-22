<?php

declare(strict_types=1);

namespace AllFeedback;

use AllFeedback\CLI\MigrateCommand;
use AllFeedback\Core\AppServiceProvider;
use AllFeedback\Core\Constants;
use AllFeedback\Core\Container;
use AllFeedback\Core\RoleManager;
use AllFeedback\Infrastructure\Database\Migrator;
use AllFeedback\Modules\ModuleLoader;
use AllFeedback\Traits\Hooks;
use AllFeedback\Traits\Singleton;

/**
 * The entry-point singleton for the All Feedback plugin.
 *
 * Wired up in the main plugin file:
 * ```php
 * Constants::init( __FILE__ );
 * Plugin::getInstance()->boot();
 * register_activation_hook( __FILE__, fn() => Plugin::getInstance()->activate() );
 * register_deactivation_hook( __FILE__, fn() => Plugin::getInstance()->deactivate() );
 * ```
 *
 * The class is `final` to prevent accidental extension that could break the
 * singleton invariant.
 *
 * @package AllFeedback
 * @since   1.0.0
 */
final class Plugin {

	use Singleton;
	use Hooks;

	/**
	 * Dependency-injection container.
	 *
	 * @var Container
	 * @since 1.0.0
	 */
	private Container $container;

	/**
	 * Top-level application service provider.
	 *
	 * @var AppServiceProvider
	 * @since 1.0.0
	 */
	private AppServiceProvider $appProvider;

	/**
	 * Module loader — discovers, registers, and boots all modules.
	 *
	 * @var ModuleLoader
	 * @since 1.0.0
	 */
	private ModuleLoader $moduleLoader;

	/**
	 * Guard against double-booting.
	 *
	 * @var bool
	 * @since 1.0.0
	 */
	private bool $booted = false;

	/**
	 * Private constructor — use `Plugin::getInstance()` instead.
	 *
	 * @since  1.0.0
	 */
	private function __construct() {
		$this->container = new Container();
	}

	/**
	 * Bootstrap the plugin.
	 *
	 * Idempotent — safe to call multiple times; only runs once.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function boot(): void {
		if ( $this->booted ) {
			return;
		}

		$this->loadConfiguration();

		$this->appProvider = $this->container->get( AppServiceProvider::class );
		$this->appProvider->boot();

		$this->moduleLoader = $this->container->get( ModuleLoader::class );
		$this->moduleLoader->loadModules();

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			$this->registerCliCommands();
		}

		$this->booted = true;

		$this->maybeFlushRewriteRules();

		$this->doAction( 'allfeedback:booted' );
	}

	/**
	 * Run on plugin activation.
	 *
	 * Checks minimum requirements, fires the activation action (which triggers
	 * migrations and role creation via `CoreServiceProvider`), and flushes rewrites.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function activate(): void {
		if ( ! Constants::meetsPHPRequirement() ) {
			wp_die(
				sprintf(
					/* translators: 1: Minimum PHP version, 2: Current PHP version */
					esc_html__( 'All Feedback requires PHP %1$s or higher. You are running PHP %2$s.', 'all-feedback' ),
					esc_html( Constants::MIN_PHP_VERSION ),
					esc_html( PHP_VERSION )
				),
				esc_html__( 'Activation Error', 'all-feedback' ),
				[ 'back_link' => true ]
			);
		}

		if ( ! Constants::meetsWPRequirement() ) {
			global $wp_version;
			wp_die(
				sprintf(
					/* translators: 1: Minimum WP version, 2: Current WP version */
					esc_html__( 'All Feedback requires WordPress %1$s or higher. You are running WordPress %2$s.', 'all-feedback' ),
					esc_html( Constants::MIN_WP_VERSION ),
					esc_html( $wp_version )
				),
				esc_html__( 'Activation Error', 'all-feedback' ),
				[ 'back_link' => true ]
			);
		}

		$this->doAction( 'allfeedback:activated' );

		// Seed wizard status so maybeRedirectToWizard() fires on first admin load.
		$wizardStatus = get_option( 'allfeedback_wizard_status' );
		if ( ! $wizardStatus || $wizardStatus === 'not_started' ) {
			update_option( 'allfeedback_wizard_status', 'pending_redirect' );
		}

		flush_rewrite_rules();
	}

	/**
	 * Run on plugin deactivation.
	 *
	 * Removes custom roles and flushes rewrite rules. Database tables are
	 * intentionally NOT dropped here — use `uninstall.php` for permanent cleanup.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function deactivate(): void {
		$this->container->get( RoleManager::class )->removeRoles();
		flush_rewrite_rules();

		$this->doAction( 'allfeedback:deactivated' );
	}

	/**
	 * Expose the DI container for cases where constructor injection is not
	 * available (e.g. helper functions, third-party code, tests).
	 *
	 * @return Container
	 * @since  1.0.0
	 */
	public function getContainer(): Container {
		return $this->container;
	}

	/**
	 * Expose the module registry so external code can query loaded modules.
	 *
	 * @return ModuleLoader
	 * @since  1.0.0
	 */
	public function getModuleLoader(): ModuleLoader {
		return $this->moduleLoader;
	}

	/**
	 * Register WP-CLI commands.
	 *
	 * Called only when `WP_CLI` is defined and truthy.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function registerCliCommands(): void {
		\WP_CLI::add_command(
			'allfeedback migrate',
			$this->container->get( MigrateCommand::class )
		);
	}

	/**
	 * Load `config/app.php` into the container under the key `'config.app'`.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function loadConfiguration(): void {
		$configPath = Constants::path( 'config/app.php' );

		if ( file_exists( $configPath ) ) {
			$appConfig = require $configPath;
			$this->container->set( 'config.app', $appConfig );
		}
	}

	/**
	 * Flush rewrite rules exactly once when the expected rewrite version changes.
	 *
	 * Bump the expected value whenever you add or remove custom endpoints so
	 * the flush happens automatically on the next page load.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function maybeFlushRewriteRules(): void {
		$optionKey = 'allfb_rewrite_version';

		$expected = $this->applyFilters( 'allfeedback:rewrite:expected_version', '1' );

		if ( get_option( $optionKey ) !== $expected ) {
			$this->addAction(
				'init',
				static function () use ( $optionKey, $expected ): void {
					flush_rewrite_rules();
					update_option( $optionKey, $expected );
				},
				99
			);
		}
	}
}
