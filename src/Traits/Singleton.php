<?php

declare(strict_types=1);

namespace AllFeedback\Traits;

defined( 'ABSPATH' ) || exit;

/**
 * Provides a thread-safe, single-instance pattern.
 *
 * Classes using this trait should declare `__construct()` as private
 * to prevent direct instantiation.
 *
 * @package AllFeedback\Traits
 * @since   1.0.0
 */
trait Singleton {

	/**
	 * Holds the single instance of the class.
	 *
	 * @var static|null
	 * @since 1.0.0
	 */
	private static ?self $instance = null;

	/**
	 * Return the single instance of the class, creating it on first call.
	 *
	 * @return static
	 * @since  1.0.0
	 */
	public static function getInstance(): static {
		if ( static::$instance === null ) {
			static::$instance = new static();
		}

		return static::$instance;
	}

	/**
	 * Prevent cloning of the singleton instance.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function __clone(): void {}

	/**
	 * Prevent unserialization of the singleton instance.
	 *
	 * @return void
	 * @throws \Exception Always throws to prevent unserialization.
	 * @since  1.0.0
	 */
	public function __wakeup(): void {
		throw new \Exception( 'Cannot unserialize singleton.' );
	}
}
