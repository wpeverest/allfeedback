<?php

declare(strict_types=1);

namespace AllFeedback\Core\Data;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Cache\CacheManager;
use AllFeedback\Core\Constants;

/**
 * Class CurrencyData
 *
 * Provides access to the bundled ISO 4217 currency list loaded from
 * resources/data/currencies.json. Results are cached via CacheManager so the
 * JSON file is only parsed once per cache lifetime.
 *
 * @since 1.0.0
 */
class CurrencyData {

	/**
	 * Transient key used to cache the currency list.
	 *
	 * @since 1.0.0
	 */
	private const CACHE_KEY = 'currencies';

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
	private const DATA_FILE = 'resources/data/currencies.json';

	/**
	 * @param CacheManager $cache Cache manager instance for transient storage.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly CacheManager $cache,
	) {}

	/**
	 * Return all currencies loaded from the data file.
	 *
	 * @return list<Currency>
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
	 * Return a flat list of ISO 4217 currency codes.
	 *
	 * @return list<string>
	 * @since 1.0.0
	 */
	public function getCodes(): array {
		return array_map(
			static fn ( Currency $currency ) => $currency->code,
			$this->getAll()
		);
	}

	/**
	 * Find a currency by its ISO 4217 code (case-insensitive).
	 *
	 * @param string $code ISO 4217 code, e.g. 'usd' or 'USD'.
	 * @return Currency|null Null when no matching currency exists.
	 * @since 1.0.0
	 */
	public function getByCode( string $code ): ?Currency {
		$code       = strtoupper( $code );
		$currencies = $this->getIndexed();

		return $currencies[ $code ] ?? null;
	}

	/**
	 * Determine whether a currency code is valid.
	 *
	 * @param string $code ISO 4217 code.
	 * @return bool
	 * @since 1.0.0
	 */
	public function isValid( string $code ): bool {
		return $this->getByCode( $code ) !== null;
	}

	/**
	 * Return all currencies keyed by their ISO 4217 code.
	 *
	 * @return array<string, Currency>
	 * @since 1.0.0
	 */
	private function getIndexed(): array {
		$indexed = [];

		foreach ( $this->getAll() as $currency ) {
			$indexed[ $currency->code ] = $currency;
		}

		return $indexed;
	}

	/**
	 * Parse the bundled JSON file and return the full currency list.
	 * Returns an empty array when the file is missing or malformed.
	 *
	 * @return list<Currency>
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
				if ( is_array( $item ) && ! empty( $item['code'] ) ) {
					$result[] = Currency::fromArray( $item );
				}
			}

			return $result;
		} catch ( \Exception $e ) {
			return [];
		}
	}

	/**
	 * Remove the cached currency list, forcing the next call to reload from disk.
	 *
	 * @since 1.0.0
	 */
	public function clearCache(): void {
		$this->cache->delete( self::CACHE_KEY );
	}
}
