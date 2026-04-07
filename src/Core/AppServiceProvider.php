<?php

declare(strict_types=1);

namespace AllFeedback\Core;

use AllFeedback\Admin\AdminServiceProvider;
use AllFeedback\API\ApiServiceProvider;
use AllFeedback\Core\Contracts\ServiceProviderInterface;
use AllFeedback\Frontend\FrontendServiceProvider;
use AllFeedback\Traits\Hooks;

/**
 * Class AppServiceProvider
 *
 * The top-level bootstrapper. Called once by Plugin::boot().
 *
 * Responsibilities:
 *  1. Load the plugin text domain.
 *  2. Boot core services (migrations, post types, etc.).
 *  3. Boot the correct context providers (Admin | Frontend | API).
 *  4. Register the global enqueue hooks that dispatch context-specific hooks.
 */
class AppServiceProvider implements ServiceProviderInterface {

	use Hooks;

	public function __construct(
		private readonly Container $container,
	) {}

	/**
	 * Main entry point. Called by Plugin::boot().
	 */
	public function boot(): void {
		$this->loadTextDomain();
		$this->bootCore();
		$this->registerProviders();
		$this->registerHooks();
	}

	// ------------------------------------------------------------------
	// Text domain
	// ------------------------------------------------------------------

	/**
	 * Load plugin translations from the /languages directory.
	 * Must run on the 'init' action so the user's locale is known.
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

	// ------------------------------------------------------------------
	// Core services
	// ------------------------------------------------------------------

	/**
	 * Boot services that must run regardless of admin / frontend context.
	 */
	private function bootCore(): void {
		$this->container->get( CoreServiceProvider::class )->boot();
	}

	// ------------------------------------------------------------------
	// Context providers
	// ------------------------------------------------------------------

	/**
	 * Boot the appropriate service providers for the current request context.
	 *
	 * - AdminServiceProvider  → WP admin screens
	 * - FrontendServiceProvider → public-facing pages
	 * - ApiServiceProvider     → all contexts (REST API routes)
	 */
	private function registerProviders(): void {
		// Admin context — but NOT during AJAX or REST requests.
		if ( $this->isAdminContext() ) {
			$this->container->get( AdminServiceProvider::class )->boot();
		}

		// Frontend context — also skip during AJAX / REST requests.
		if ( ! $this->isAdminContext() ) {
			$this->container->get( FrontendServiceProvider::class )->boot();
		}

		// REST API routes are registered on every request.
		$this->container->get( ApiServiceProvider::class )->boot();
	}

	// ------------------------------------------------------------------
	// Global enqueue hooks
	// ------------------------------------------------------------------

	/**
	 * Register the two enqueue entry-points and let context-specific providers
	 * listen to the namespaced sub-hooks.
	 */
	private function registerHooks(): void {
		// 'admin_enqueue_scripts' fires on every admin screen — passes the $hook string.
		$this->addAction( 'admin_enqueue_scripts', [ $this, 'enqueueAdminAssets' ] );

		// 'wp_enqueue_scripts' fires on every public page.
		$this->addAction( 'wp_enqueue_scripts', [ $this, 'enqueueFrontendAssets' ] );
	}

	/**
	 * Relay admin enqueue to a namespaced action so providers can listen without
	 * needing to know the WordPress hook name.
	 *
	 * @param string $hook Current admin page hook suffix.
	 */
	public function enqueueAdminAssets( string $hook ): void {
		$this->doAction( 'rmb:enqueue-assets:admin', $hook );
	}

	/**
	 * Relay frontend enqueue to a namespaced action.
	 */
	public function enqueueFrontendAssets(): void {
		$this->doAction( 'rmb:enqueue-assets:frontend' );
	}

	// ------------------------------------------------------------------
	// Helpers
	// ------------------------------------------------------------------

	/**
	 * Determine if we're running inside the WP admin.
	 *
	 * is_admin() returns true even for AJAX and REST requests originated from
	 * an admin screen, so we explicitly exclude those contexts so that the
	 * frontend provider boots correctly for API consumers.
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
