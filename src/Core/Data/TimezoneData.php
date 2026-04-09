<?php

declare(strict_types=1);

namespace AllFeedback\Core\Data;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Cache\CacheManager;
use AllFeedback\Core\Constants;

/**
 * Class TimezoneData
 *
 * Provides access to the bundled IANA timezone list loaded from
 * resources/data/timezones.json. Results are cached via CacheManager so the
 * JSON file is only parsed once per cache lifetime.
 *
 * @since 1.0.0
 */
class TimezoneData {

	/**
	 * Transient key used to cache the timezone list.
	 *
	 * @since 1.0.0
	 */
	private const CACHE_KEY = 'timezones';

	/**
	 * Cache TTL in seconds (24 hours).
	 *
	 * @since 1.0.0
	 */
	private const CACHE_TTL = 86400;

	/**
	 * Path to the data file relative to the plugin root.
	 *
	 * @since 1.0.0
	 */
	private const DATA_FILE = 'resources/data/timezones.json';

	/**
	 * @param CacheManager $cache Cache manager instance for transient storage.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly CacheManager $cache,
	) {}

	/**
	 * Return all timezone groups loaded from the data file.
	 *
	 * @return list<Timezone>
	 * @since 1.0.0
	 */
	public function getAll(): array {
		return $this->cache->remember(
			self::CACHE_KEY,
			[ $this, 'loadFromFile' ],
			self::CACHE_TTL
		);
	}

	/**
	 * Return a flat list of IANA identifiers grouped by their display label.
	 *
	 * Returns an array of [ 'identifier' => string, 'label' => string ] entries
	 * suitable for building a select element.
	 *
	 * @return list<array{identifier: string, label: string}>
	 * @since 1.0.0
	 */
	public function getOptions(): array {
		$options = [];

		foreach ( $this->getAll() as $tz ) {
			foreach ( $tz->utc as $identifier ) {
				$options[] = [
					'identifier' => $identifier,
					'label'      => $tz->text,
				];
			}
		}

		return $options;
	}

	/**
	 * Find the Timezone group that contains the given IANA identifier.
	 *
	 * @param string $identifier IANA timezone identifier, e.g. 'America/New_York'.
	 * @return Timezone|null Null when no group contains the identifier.
	 * @since 1.0.0
	 */
	public function findByIdentifier( string $identifier ): ?Timezone {
		foreach ( $this->getAll() as $tz ) {
			if ( in_array( $identifier, $tz->utc, true ) ) {
				return $tz;
			}
		}

		return null;
	}

	/**
	 * Determine whether an IANA timezone identifier is valid.
	 *
	 * @param string $identifier IANA timezone identifier.
	 * @return bool
	 * @since 1.0.0
	 */
	public function isValid( string $identifier ): bool {
		return $this->findByIdentifier( $identifier ) !== null;
	}

	/**
	 * Parse the bundled JSON file and return the full timezone list.
	 * Returns an empty array when the file is missing or malformed.
	 *
	 * @return list<Timezone>
	 * @since 1.0.0
	 */
	public function loadFromFile(): array {
		$path = Constants::path( self::DATA_FILE );

		try {
			if ( ! is_readable( $path ) ) {
				return [];
			}
			$json = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$data = json_decode( $json, true );

			if ( ! is_array( $data ) ) {
				return [];
			}

			$result = [];

			foreach ( $data as $item ) {
				if ( is_array( $item ) && ! empty( $item['value'] ) ) {
					$result[] = Timezone::fromArray( $item );
				}
			}

			return $result;
		} catch ( \Exception ) {
			return [];
		}
	}

	/**
	 * Remove the cached timezone list, forcing the next call to reload from disk.
	 *
	 * @since 1.0.0
	 */
	public function clearCache(): void {
		$this->cache->delete( self::CACHE_KEY );
	}
}
