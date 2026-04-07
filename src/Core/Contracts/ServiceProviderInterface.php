<?php

declare(strict_types=1);

namespace AllFeedback\Core\Contracts;

/**
 * Interface ServiceProviderInterface
 *
 * Implemented by "core-layer" service providers that only need a boot() step
 * (they don't need to register DI definitions — those live in config/services.php).
 */
interface ServiceProviderInterface {

	/**
	 * Wire up WordPress hooks and fire any initialisation logic.
	 * Called once by AppServiceProvider::boot().
	 */
	public function boot(): void;
}
