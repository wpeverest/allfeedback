<?php
/**
 * Service provider.
 *
 * @package AllFeedback\Core
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Core;

defined( 'ABSPATH' ) || exit;

use DI\ContainerBuilder;

/**
 * Contract implemented by Admin, Frontend, and API service providers.
 *
 * Providers may optionally register extra DI definitions via `register()`
 * before the container is compiled, and must wire WordPress hooks via `boot()`.
 *
 * @package AllFeedback\Core
 * @since   1.0.0
 */
interface ServiceProvider {

	/**
	 * Optionally add extra DI definitions before the container is built.
	 *
	 * @param  ContainerBuilder $builder PHP-DI builder instance.
	 * @return void
	 * @since  1.0.0
	 */
	public function register( ContainerBuilder $builder ): void;

	/**
	 * Register WordPress hooks and initialise services.
	 *
	 * Called after the container has been compiled.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function boot(): void;
}
