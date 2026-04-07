<?php

declare(strict_types=1);

namespace AllFeedback\Core;

use DI\ContainerBuilder;

/**
 * Interface ServiceProvider
 *
 * Implemented by Admin, Frontend, and API service providers.
 * These providers may optionally register extra DI definitions
 * via register() before the container is compiled, and must
 * boot WordPress hooks via boot().
 */
interface ServiceProvider {

	/**
	 * Optionally add extra DI definitions before the container is built.
	 *
	 * @param ContainerBuilder $builder PHP-DI builder instance.
	 */
	public function register( ContainerBuilder $builder ): void;

	/**
	 * Register WordPress hooks and initialise services.
	 * Called after the container has been compiled.
	 */
	public function boot(): void;
}
