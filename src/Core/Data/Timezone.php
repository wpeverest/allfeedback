<?php

declare(strict_types=1);

namespace AllFeedback\Core\Data;

defined( 'ABSPATH' ) || exit;

/**
 * Class Timezone
 *
 * Immutable value object representing a timezone group entry as loaded from
 * the bundled timezones.json data file. A single entry may contain multiple
 * IANA identifiers that share the same display label and UTC offset.
 *
 * @since 1.0.0
 */
final class Timezone {

	/**
	 * @param string        $value  Windows-style timezone identifier used as the group key.
	 * @param string        $abbr   Common abbreviation (e.g. 'EST').
	 * @param float         $offset UTC offset in hours (e.g. -5.0).
	 * @param string        $text   Human-readable display label (e.g. '(UTC-05:00) Eastern Time').
	 * @param list<string>  $utc    IANA identifiers belonging to this group.
	 * @since 1.0.0
	 */
	public function __construct(
		public readonly string $value,
		public readonly string $abbr,
		public readonly float $offset,
		public readonly string $text,
		/** @var list<string> */
		public readonly array $utc,
	) {}

	/**
	 * Construct a Timezone from a raw associative array (e.g. a decoded JSON entry).
	 *
	 * @param array<string, mixed> $data
	 * @return static
	 * @since 1.0.0
	 */
	public static function fromArray( array $data ): self {
		return new self(
			(string) ( $data['value'] ?? '' ),
			(string) ( $data['abbr'] ?? '' ),
			(float) ( $data['offset'] ?? 0 ),
			(string) ( $data['text'] ?? '' ),
			array_values( array_filter( (array) ( $data['utc'] ?? [] ), 'is_string' ) ),
		);
	}
}
