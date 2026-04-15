<?php

declare(strict_types=1);

namespace AllFeedback\Core;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Admin\AdminServiceProvider;
use AllFeedback\API\ApiServiceProvider;
use AllFeedback\Core\Contracts\ServiceProviderInterface;
use AllFeedback\Core\Jobs\JobServiceProvider;
use AllFeedback\Frontend\FrontendServiceProvider;
use AllFeedback\Infrastructure\Mail\NotificationServiceProvider;
use AllFeedback\Traits\Hooks;

/**
 * Class AppServiceProvider
 *
 * The top-level bootstrapper. Called once by Plugin::boot().
 *
 * Responsibilities:
 *  1. Load the plugin text domain.
 *  2. Boot core services (migrations, post types, roles).
 *  3. Boot context-specific providers (Admin | Frontend | API).
 *  4. Boot cross-cutting providers (Jobs, Notifications, Google).
 *  5. Register global enqueue hooks.
 *
 * @since 1.0.0
 */
class AppServiceProvider implements ServiceProviderInterface {

	use Hooks;

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly Container $container,
	) {}

	/**
	 * Main entry point. Called by Plugin::boot().
	 *
	 * @since 1.0.0
	 */
	public function boot(): void {
		$this->loadTextDomain();
		$this->bootCore();
		$this->registerProviders();
		$this->registerHooks();
	}

	/**
	 * Load plugin translations from the /languages directory.
	 *
	 * @since 1.0.0
	 */
	private function loadTextDomain(): void {
		$this->addAction(
			'init',
			function () {
				load_plugin_textdomain(
					Constants::textDomain(),
					false,
					Constants::path( 'languages/' )
				);
			}
		);
	}

	/**
	 * Boot services that must run regardless of admin / frontend context.
	 *
	 * @since 1.0.0
	 */
	private function bootCore(): void {
		$this->container->get( CoreServiceProvider::class )->boot();
	}

	/**
	 * Boot the appropriate service providers for the current request context.
	 *
	 * @since 1.0.0
	 */
	private function registerProviders(): void {
		if ( $this->isAdminContext() ) {
			$this->container->get( AdminServiceProvider::class )->boot();
		}

		// Boot on every request: registers the Gutenberg block (needed in the
		// block editor = admin context) and shortcodes (needed on the frontend).
		// Asset enqueueing inside FrontendServiceProvider is guarded by its own
		// namespaced action and only fires on actual frontend page loads.
		$this->container->get( FrontendServiceProvider::class )->boot();

		// REST API routes registered on every request.
		$this->container->get( ApiServiceProvider::class )->boot();

		// Cross-cutting providers — always boot.
		$this->container->get( JobServiceProvider::class )->boot();
		$this->container->get( NotificationServiceProvider::class )->boot();
	}

	/**
	 * Register global enqueue hooks.
	 *
	 * @since 1.0.0
	 */
	private function registerHooks(): void {
		$this->addAction( 'admin_enqueue_scripts', [ $this, 'enqueueAdminAssets' ] );
		$this->addAction( 'wp_enqueue_scripts', [ $this, 'enqueueFrontendAssets' ] );
	}

	/**
	 * Relay admin enqueue to a namespaced action.
	 *
	 * @param string $hook Current admin page hook suffix.
	 * @since 1.0.0
	 */
	public function enqueueAdminAssets( string $hook ): void {
		$this->doAction( 'allfeedback:enqueue-assets:admin', $hook );
	}

	/**
	 * Relay frontend enqueue to a namespaced action.
	 *
	 * @since 1.0.0
	 */
	public function enqueueFrontendAssets(): void {
		$this->doAction( 'allfeedback:enqueue-assets:frontend' );
	}

	/**
	 * Determine if we are running inside the WP admin (excluding AJAX and REST).
	 *
	 * @since 1.0.0
	 */
	private function isAdminContext(): bool {
		if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
			return false;
		}

		if ( wp_doing_ajax() ) {
			return false;
		}

		return is_admin();
	}
}
