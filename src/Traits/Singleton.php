<?php

declare(strict_types=1);

namespace AllFeedback\Traits;

/**
 * Trait Singleton
 *
 * Provides a thread-safe, single-instance pattern.
 * Classes using this trait should declare __construct() as private.
 */
trait Singleton {

	/** @var static|null Holds the single instance. */
	private static ?self $instance = null;

	/**
	 * Returns the single instance of the class, creating it on first call.
	 */
	public static function getInstance(): static {
		if ( static::$instance === null ) {
			static::$instance = new static();
		}

		return static::$instance;
	}

	/** Prevent cloning. */
	private function __clone() {}

	/**
	 * Prevent unserialization.
	 *
	 * @throws \Exception Always.
	 */
	public function __wakeup(): void {
		throw new \Exception( 'Cannot unserialize singleton.' );
	}
}
