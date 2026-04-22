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
 * The top-level bootstrapper. Called once by `Plugin::boot()`.
 *
 * Responsibilities:
 *  1. Load the plugin text domain.
 *  2. Boot core services (migrations, post types, roles).
 *  3. Boot context-specific providers (Admin | Frontend | API).
 *  4. Boot cross-cutting providers (Jobs, Notifications).
 *  5. Register global enqueue hooks.
 *
 * @package AllFeedback\Core
 * @since   1.0.0
 */
class AppServiceProvider implements ServiceProviderInterface {

	use Hooks;

	/**
	 * @param  Container $container DI container for resolving service providers.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Container $container,
	) {}

	/**
	 * Main entry point. Called by Plugin::boot().
	 *
	 * @return void
	 * @since  1.0.0
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
	 * @return void
	 * @since  1.0.0
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
	 * @return void
	 * @since  1.0.0
	 */
	private function bootCore(): void {
		$this->container->get( CoreServiceProvider::class )->boot();
	}

	/**
	 * Boot the appropriate service providers for the current request context.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function registerProviders(): void {
		if ( $this->isAdminContext() ) {
			$this->container->get( AdminServiceProvider::class )->boot();
		}

		$this->container->get( FrontendServiceProvider::class )->boot();
		$this->container->get( ApiServiceProvider::class )->boot();
		$this->container->get( JobServiceProvider::class )->boot();
		$this->container->get( NotificationServiceProvider::class )->boot();
	}

	/**
	 * Register global enqueue hooks.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function registerHooks(): void {
		$this->addAction( 'admin_enqueue_scripts', [ $this, 'enqueueAdminAssets' ] );
		$this->addAction( 'wp_enqueue_scripts', [ $this, 'enqueueFrontendAssets' ] );
	}

	/**
	 * Relay admin enqueue to a namespaced action.
	 *
	 * @param  string $hook Current admin page hook suffix.
	 * @return void
	 * @since  1.0.0
	 */
	public function enqueueAdminAssets( string $hook ): void {
		$this->doAction( 'allfeedback:enqueue-assets:admin', $hook );
	}

	/**
	 * Relay frontend enqueue to a namespaced action.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function enqueueFrontendAssets(): void {
		$this->doAction( 'allfeedback:enqueue-assets:frontend' );
	}

	/**
	 * Determine if we are running inside the WP admin (excluding AJAX and REST).
	 *
	 * @return bool
	 * @since  1.0.0
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
