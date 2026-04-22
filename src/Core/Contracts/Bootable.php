<?php

declare(strict_types=1);

namespace AllFeedback\Core\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Interface Bootable
 *
 * Implemented by any class that needs to run initialisation logic after the
 * dependency-injection container has been fully built.
 *
 * @package AllFeedback\Core\Contracts
 * @since   1.0.0
 */
interface Bootable {

	/**
	 * Execute any boot-time initialisation for this class.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function boot(): void;
}
