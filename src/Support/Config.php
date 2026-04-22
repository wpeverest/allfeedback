<?php

declare(strict_types=1);

namespace AllFeedback\Support;

/**
 * Class Config
 *
 * Wraps the array returned by config/app.php and provides a dot-notation
 * accessor so deep values can be read cleanly:
 *
 *   $config->get( 'cache.ttl' );   // → 3600
 *   $config->get( 'paths.base' );  // → /var/www/html/wp-content/plugins/all-feedback/
 *
 * @package AllFeedback\Support
 * @since   1.0.0
 */
class Config {

	/**
	 * Raw config array loaded from config/app.php.
	 *
	 * @var array<string, mixed>
	 * @since 1.0.0
	 */
	private array $config;

	/**
	 * @param  array<string, mixed> $config The config array injected by the DI container
	 *                                      from the 'config.app' binding in services.php.
	 * @since  1.0.0
	 */
	public function __construct( array $config ) {
		$this->config = $config;
	}

	/**
	 * Retrieve a config value using dot notation.
	 *
	 * @param  string $key     Dot-separated path, e.g. 'cache.ttl'.
	 * @param  mixed  $default Returned when the key is not found.
	 * @return mixed
	 * @since  1.0.0
	 */
	public function get( string $key, mixed $default = null ): mixed {
		$parts  = explode( '.', $key );
		$cursor = $this->config;

		foreach ( $parts as $part ) {
			if ( ! is_array( $cursor ) || ! array_key_exists( $part, $cursor ) ) {
				return $default;
			}
			$cursor = $cursor[ $part ];
		}

		return $cursor;
	}

	/**
	 * Check whether a config key exists (dot notation supported).
	 *
	 * @param  string $key Dot-separated path.
	 * @return bool
	 * @since  1.0.0
	 */
	public function has( string $key ): bool {
		return $this->get( $key, '__RMB_MISSING__' ) !== '__RMB_MISSING__';
	}

	/**
	 * Return the entire raw config array.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	public function all(): array {
		return $this->config;
	}
}
