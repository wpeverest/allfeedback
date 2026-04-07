<?php

declare(strict_types=1);

namespace AllFeedback;

use AllFeedback\Core\AppServiceProvider;
use AllFeedback\Core\Constants;
use AllFeedback\Core\Container;
use AllFeedback\Core\RoleManager;
use AllFeedback\Modules\ModuleLoader;
use AllFeedback\Traits\Hooks;
use AllFeedback\Traits\Singleton;

/**
 * Class Plugin
 *
 * The entry-point singleton. Wired up in the main plugin file:
 *
 *   Constants::init( __FILE__ );
 *   Plugin::getInstance()->boot();
 *   register_activation_hook( __FILE__, fn() => Plugin::getInstance()->activate() );
 *   register_deactivation_hook( __FILE__, fn() => Plugin::getInstance()->deactivate() );
 *
 * The class is final to prevent accidental extension that could break the singleton invariant.
 */
final class Plugin {

	use Singleton;
	use Hooks;

	/** Dependency-injection container. */
	private Container $container;

	/** Top-level application service provider. */
	private AppServiceProvider $appProvider;

	/** Module loader — discovers, registers, and boots all modules. */
	private ModuleLoader $moduleLoader;

	/** Guard against double-booting. */
	private bool $booted = false;

	/**
	 * Private constructor — use Plugin::getInstance() instead.
	 */
	private function __construct() {
		// Build the DI container (compiled to disk in production).
		$this->container = new Container();
	}

	// ------------------------------------------------------------------
	// Lifecycle
	// ------------------------------------------------------------------

	/**
	 * Bootstrap the plugin.
	 * Idempotent — safe to call multiple times; only runs once.
	 */
	public function boot(): void {
		if ( $this->booted ) {
			return;
		}

		// Push the app configuration array into the container so Config::class
		// can receive it via constructor injection.
		$this->loadConfiguration();

		// Resolve and boot the top-level provider (text-domain, core services,
		// admin / frontend / API providers, global enqueue hooks…).
		$this->appProvider = $this->container->get( AppServiceProvider::class );
		$this->appProvider->boot();

		// Discover and boot all registered modules (add-ons).
		$this->moduleLoader = $this->container->get( ModuleLoader::class );
		$this->moduleLoader->loadModules();

		$this->booted = true;

		// Flush rewrite rules once per "expected version" bump.
		$this->maybeFlushRewriteRules();

		/**
		 * Action: rmb:booted
		 *
		 * Fires once after the plugin is fully initialised.
		 * Third-party code can hook here to add functionality.
		 */
		$this->doAction( 'rmb:booted' );
	}

	/**
	 * Run on plugin activation.
	 *
	 * Checks minimum requirements, fires the activation action (which triggers
	 * migrations + role creation via CoreServiceProvider), and flushes rewrites.
	 */
	public function activate(): void {
		// Block activation on unsupported servers.
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

		/**
		 * Action: rmb:activated
		 *
		 * CoreServiceProvider::onActivation() hooks here to run migrations
		 * and create custom user roles.
		 */
		$this->doAction( 'rmb:activated' );

		// Flush rewrite rules so any new endpoints are live immediately.
		flush_rewrite_rules();
	}

	/**
	 * Run on plugin deactivation.
	 *
	 * Removes custom roles and flushes rewrite rules.
	 * Note: database tables are intentionally NOT dropped here —
	 * use uninstall.php for permanent cleanup.
	 */
	public function deactivate(): void {
		$this->container->get( RoleManager::class )->removeRoles();
		flush_rewrite_rules();

		/**
		 * Action: rmb:deactivated
		 *
		 * Fires after the plugin has been deactivated.
		 */
		$this->doAction( 'rmb:deactivated' );
	}

	// ------------------------------------------------------------------
	// Accessors
	// ------------------------------------------------------------------

	/**
	 * Expose the DI container for cases where constructor injection is not
	 * available (e.g. helper functions, third-party code, tests).
	 */
	public function getContainer(): Container {
		return $this->container;
	}

	/**
	 * Expose the module registry so external code can query loaded modules.
	 */
	public function getModuleLoader(): ModuleLoader {
		return $this->moduleLoader;
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Load config/app.php into the container under the key 'config.app'.
	 * The Config class and service providers receive this as constructor input.
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
	 */
	private function maybeFlushRewriteRules(): void {
		$optionKey = 'allfb_rewrite_version';

		/**
		 * Filter: rmb:rewrite:expected_version
		 *
		 * Increment the default value to trigger a rewrite flush on the next load.
		 *
		 * @param string $version Current expected rewrite version.
		 */
		$expected = $this->applyFilters( 'rmb:rewrite:expected_version', '1' );

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
