<?php
/**
 * Cache manager.
 *
 * @package AllFeedback\Core\Cache
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Core\Cache;

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

/**
 * Class CacheManager
 *
 * Thin wrapper around WordPress transients that adds tag-based invalidation
 * and a remember() convenience helper for the AllFeedback plugin.
 *
 * @package AllFeedback\Core\Cache
 * @since   1.0.0
 */
class CacheManager {

	/**
	 * Prefix used for tag-index transients — must include the plugin slug so the
	 * key is always unique and properly namespaced in the wp_options table.
	 */
	private const ALLFEEDBACK_TAG_PREFIX = 'allfeedback_tag_';

	/**
	 * Key prefix prepended to every transient name.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private string $prefix;

	/**
	 * Default TTL in seconds when none is supplied by the caller.
	 *
	 * @var int
	 * @since 1.0.0
	 */
	private int $default_ttl;

	/**
	 * Constructor.
	 *
	 * @param  string $prefix     Prefix for all transient keys. Default 'allfeedback_'.
	 * @param  int    $default_ttl Default time-to-live in seconds. Default 3600.
	 * @since  1.0.0
	 */
	public function __construct( string $prefix = 'allfeedback_', int $default_ttl = 3600 ) {
		$this->prefix      = $prefix;
		$this->default_ttl = $default_ttl;
	}

	/**
	 * Retrieve a cached value by key, returning $default when the entry
	 * does not exist or has expired.
	 *
	 * @param  string $key     Cache key (without prefix).
	 * @param  mixed  $fallback Value to return on cache miss.
	 * @return mixed
	 * @since  1.0.0
	 */
	public function get( string $key, mixed $fallback = null ): mixed {
		$value = get_transient( $this->prefix . $key );
		return $value !== false ? $value : $fallback;
	}

	/**
	 * Store a value in the cache.
	 *
	 * @param  string   $key   Cache key (without prefix).
	 * @param  mixed    $value Value to store.
	 * @param  int|null $ttl   Time-to-live in seconds. Null uses the default.
	 * @return bool True on success.
	 * @since  1.0.0
	 */
	public function set( string $key, mixed $value, ?int $ttl = null ): bool {
		$ttl = $ttl ?? $this->default_ttl;
		return set_transient( $this->prefix . $key, $value, $ttl );
	}

	/**
	 * Determine whether a non-expired entry exists for the given key.
	 *
	 * @param  string $key Cache key (without prefix).
	 * @return bool
	 * @since  1.0.0
	 */
	public function has( string $key ): bool {
		return false !== get_transient( $this->prefix . $key );
	}

	/**
	 * Remove a cached entry.
	 *
	 * @param  string $key Cache key (without prefix).
	 * @return bool True on success.
	 * @since  1.0.0
	 */
	public function delete( string $key ): bool {
		return delete_transient( $this->prefix . $key );
	}

	/**
	 * Retrieve a cached value or compute and store it if absent.
	 *
	 * @param  string   $key      Cache key (without prefix).
	 * @param  callable $callback Produces the value when the cache misses.
	 * @param  int|null $ttl      Time-to-live in seconds. Null uses the default.
	 * @return mixed
	 * @since  1.0.0
	 */
	public function remember( string $key, callable $callback, ?int $ttl = null ): mixed {
		if ( $this->has( $key ) ) {
			return $this->get( $key );
		}

		$value = $callback();
		$this->set( $key, $value, $ttl );

		return $value;
	}

	/**
	 * Delete all cache entries associated with a named tag.
	 *
	 * @param  string $tag The tag name.
	 * @return void
	 * @since  1.0.0
	 */
	public function flushTag( string $tag ): void {
		$keys = get_transient( self::ALLFEEDBACK_TAG_PREFIX . $tag );

		if ( is_array( $keys ) ) {
			foreach ( $keys as $key ) {
				$this->delete( $key );
			}
		}

		delete_transient( self::ALLFEEDBACK_TAG_PREFIX . $tag );
	}

	/**
	 * Associate a cache key with one or more tags for group invalidation.
	 *
	 * @param  string   $key  Cache key (without prefix).
	 * @param  string[] $tags Tag names to associate the key with.
	 * @return void
	 * @since  1.0.0
	 */
	public function tag( string $key, array $tags ): void {
		foreach ( $tags as $tag ) {
			$keys_raw = get_transient( self::ALLFEEDBACK_TAG_PREFIX . $tag );
			$keys     = $keys_raw !== false ? $keys_raw : [];

			if ( ! in_array( $key, $keys, true ) ) {
				$keys[] = $key;
				set_transient( self::ALLFEEDBACK_TAG_PREFIX . $tag, $keys, $this->default_ttl );
			}
		}
	}

	/**
	 * Remove all transients created by this cache manager instance.
	 *
	 * Performs a direct database DELETE so it is not subject to the object
	 * cache and clears both the value and timeout rows atomically.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function flush(): void {
		global $wpdb;

		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
				$wpdb->esc_like( '_transient_' . $this->prefix ) . '%',
				$wpdb->esc_like( '_transient_timeout_' . $this->prefix ) . '%'
			)
		);
	}
}
