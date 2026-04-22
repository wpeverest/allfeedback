<?php

declare(strict_types=1);

namespace AllFeedback\Core\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Interface Registrable
 *
 * Implemented by any class that registers itself with WordPress hooks,
 * REST routes, or other extension points.
 *
 * @package AllFeedback\Core\Contracts
 * @since   1.0.0
 */
interface Registrable {

	/**
	 * Register the class with its relevant WordPress extension points.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function register(): void;
}
