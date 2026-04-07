<?php

declare(strict_types=1);

namespace AllFeedback\Core\Settings;

use AllFeedback\Traits\Hooks;

/**
 * Class SettingsManager
 *
 * Typed plugin settings with defaults, schema, and persist.
 * All settings live in a single wp_options row for efficiency.
 *
 * How to add a new setting:
 *   1. Add the key + default value to DEFAULTS.
 *   2. Optionally add a schema entry in getSchema() for REST API consumers.
 *
 * Usage:
 *   $sm = $container->get( SettingsManager::class );
 *   $sm->get( 'sample_option' );         // single value
 *   $sm->all();                          // entire settings array
 *   $sm->set( 'sample_option', 'foo' );  // persist single value
 *   $sm->setMultiple( [ 'sample_option' => 'bar' ] );
 */
class SettingsManager {

	use Hooks;

	private const OPTION_KEY = '_allfb_settings';

	/**
	 * Default values for every setting.
	 * Keys not present here are ignored in set/setMultiple.
	 */
	private const DEFAULTS = [
		// ── General ───────────────────────────────────────────────────
		'plugin_name'      => 'All Feedback',
		'sample_option'    => '',
		'sample_bool'      => false,
		'sample_int'       => 10,

		// ── Add your settings below ───────────────────────────────────
	];

	/** Lazy-loaded merged settings (defaults + stored values). */
	private ?array $loaded = null;

	// ------------------------------------------------------------------
	// Reads
	// ------------------------------------------------------------------

	/**
	 * Get a single setting, or all settings when $key is null.
	 *
	 * @param string|null $key Setting key (null → returns all).
	 * @return mixed
	 */
	public function get( ?string $key = null ): mixed {
		$all = $this->all();

		if ( $key === null || $key === '' ) {
			return $all;
		}

		return $all[ $key ] ?? self::DEFAULTS[ $key ] ?? null;
	}

	/**
	 * Return all settings merged with defaults.
	 *
	 * @return array<string, mixed>
	 */
	public function all(): array {
		if ( $this->loaded === null ) {
			$stored       = get_option( self::OPTION_KEY, [] );
			$this->loaded = is_array( $stored ) ? $stored : [];
		}

		// Only merge keys that exist in DEFAULTS so stale keys are excluded.
		return array_merge(
			self::DEFAULTS,
			array_intersect_key( $this->loaded, self::DEFAULTS )
		);
	}

	/** Return the raw defaults array. */
	public function getDefaults(): array {
		return self::DEFAULTS;
	}

	// ------------------------------------------------------------------
	// Writes
	// ------------------------------------------------------------------

	/**
	 * Persist a single setting.
	 * Silently ignores keys not defined in DEFAULTS.
	 *
	 * @param string $key   Setting key.
	 * @param mixed  $value Raw value — will be sanitised.
	 */
	public function set( string $key, mixed $value ): void {
		if ( ! array_key_exists( $key, self::DEFAULTS ) ) {
			return;
		}

		$all         = $this->all();
		$all[ $key ] = $this->sanitize( $key, $value );
		$this->persist( $all );
	}

	/**
	 * Persist multiple settings at once.
	 * Keys not in DEFAULTS are silently ignored.
	 *
	 * @param array<string, mixed> $settings
	 */
	public function setMultiple( array $settings ): void {
		$all     = $this->all();
		$allowed = array_intersect_key( $settings, self::DEFAULTS );

		foreach ( $allowed as $key => $value ) {
			$all[ $key ] = $this->sanitize( $key, $value );
		}

		$this->persist( $all );
	}

	// ------------------------------------------------------------------
	// Schema (for REST API documentation)
	// ------------------------------------------------------------------

	/**
	 * Return a REST-API-compatible schema describing all settings.
	 * Extend this when you add settings that are exposed via the API.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public function getSchema(): array {
		return [
			'plugin_name'   => [
				'type'        => 'string',
				'default'     => self::DEFAULTS['plugin_name'],
				'description' => __( 'Plugin display name.', 'all-feedback' ),
			],
			'sample_option' => [
				'type'        => 'string',
				'default'     => self::DEFAULTS['sample_option'],
				'description' => __( 'A sample text option.', 'all-feedback' ),
			],
			'sample_bool'   => [
				'type'        => 'boolean',
				'default'     => self::DEFAULTS['sample_bool'],
				'description' => __( 'A sample boolean toggle.', 'all-feedback' ),
			],
			'sample_int'    => [
				'type'        => 'integer',
				'default'     => self::DEFAULTS['sample_int'],
				'minimum'     => 1,
				'maximum'     => 100,
				'description' => __( 'A sample integer setting.', 'all-feedback' ),
			],
		];
	}

	// ------------------------------------------------------------------
	// Internal
	// ------------------------------------------------------------------

	/**
	 * Sanitise a value based on the type of the default for that key.
	 *
	 * @param string $key   Setting key.
	 * @param mixed  $value Raw value.
	 * @return mixed        Sanitised value.
	 */
	private function sanitize( string $key, mixed $value ): mixed {
		$default = self::DEFAULTS[ $key ] ?? null;

		if ( is_bool( $default ) ) {
			return (bool) $value;
		}

		if ( is_int( $default ) ) {
			return (int) $value;
		}

		if ( is_string( $default ) ) {
			return is_string( $value )
				? sanitize_text_field( $value )
				: (string) $value;
		}

		return $value;
	}

	/**
	 * Write settings to the database and bust the in-memory cache.
	 *
	 * @param array<string, mixed> $settings Merged settings array.
	 */
	private function persist( array $settings ): void {
		// Strip keys not in DEFAULTS to keep the option row clean.
		$toStore = array_intersect_key( $settings, self::DEFAULTS );
		update_option( self::OPTION_KEY, $toStore );
		$this->loaded = $toStore;

		/**
		 * Action: rmb:settings:updated
		 *
		 * Fires after settings are persisted.
		 *
		 * @param array<string, mixed> $toStore The saved settings array.
		 */
		$this->doAction( 'rmb:settings:updated', $toStore );
	}
}
