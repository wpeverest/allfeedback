<?php

declare(strict_types=1);

namespace AllFeedback\Core\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Implemented by core-layer service providers that only need a `boot()` step.
 *
 * These providers do not need to register DI definitions — those live in
 * `config/services.php`. They only hook into WordPress during `boot()`.
 *
 * @package AllFeedback\Core\Contracts
 * @since   1.0.0
 */
interface ServiceProviderInterface {

	/**
	 * Wire up WordPress hooks and fire any initialisation logic.
	 *
	 * Called once by `AppServiceProvider::boot()`.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function boot(): void;
}
