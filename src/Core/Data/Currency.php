<?php

declare(strict_types=1);

namespace AllFeedback\Core\Data;

defined( 'ABSPATH' ) || exit;

/**
 * Class Currency
 *
 * Immutable value object representing a single ISO 4217 currency entry as
 * loaded from the bundled currencies.json data file.
 *
 * @since 1.0.0
 */
final class Currency {

	/**
	 * @param string $code          ISO 4217 currency code (e.g. 'USD').
	 * @param string $name          Display name (e.g. 'US Dollar').
	 * @param string $symbol        Currency symbol (e.g. '$').
	 * @param string $symbolNative  Symbol as used in the currency's native locale.
	 * @param string $namePlural    Plural display name (e.g. 'US dollars').
	 * @param int    $decimalDigits Number of decimal places conventionally used.
	 * @param int    $rounding      Rounding increment (0 = standard).
	 * @since 1.0.0
	 */
	public function __construct(
		public readonly string $code,
		public readonly string $name,
		public readonly string $symbol,
		public readonly string $symbolNative,
		public readonly string $namePlural,
		public readonly int $decimalDigits,
		public readonly int $rounding,
	) {}

	/**
	 * Construct a Currency from a raw associative array (e.g. a decoded JSON entry).
	 *
	 * @param array<string, mixed> $data
	 * @return static
	 * @since 1.0.0
	 */
	public static function fromArray( array $data ): self {
		return new self(
			strtoupper( (string) ( $data['code'] ?? '' ) ),
			(string) ( $data['name'] ?? '' ),
			(string) ( $data['symbol'] ?? '' ),
			(string) ( $data['symbol_native'] ?? '' ),
			(string) ( $data['name_plural'] ?? '' ),
			(int) ( $data['decimal_digits'] ?? 2 ),
			(int) ( $data['rounding'] ?? 0 ),
		);
	}
}
