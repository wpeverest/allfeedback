<?php

declare(strict_types=1);

namespace AllFeedback\Core\Settings;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Traits\Hooks;

/**
 * Class SettingsManager
 *
 * Single-row wp_options store for all plugin-wide settings.
 * Handles defaults, REST schema, type-safe sanitisation, enum validation,
 * and atomic persistence.
 *
 * All values live under the `_allfb_settings` option key so the entire
 * settings surface costs a single DB read on first access.
 *
 * ──────────────────────────────────────────────────────────────────────
 * How to add a new setting:
 *   1. Add the key + default value to DEFAULTS.
 *   2. If the value is constrained to a fixed set of strings, add it to ENUMS.
 *   3. Add a matching entry in getSchema() for REST API documentation
 *      and WP argument validation.
 * ──────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   $sm = $container->get( SettingsManager::class );
 *   $sm->get( 'widget_color' );                          // single value
 *   $sm->all();                                           // full merged array
 *   $sm->set( 'widget_color', '#FF0000' );               // persist one value
 *   $sm->setMultiple( [ 'widget_color' => '#FF0000' ] ); // persist many values
 *   $sm->reset();                                         // wipe back to defaults
 *
 * @package AllFeedback\Core\Settings
 * @since   1.0.0
 */
class SettingsManager {

	use Hooks;

	/**
	 * WordPress option key under which all settings are serialised.
	 *
	 * @since 1.0.0
	 */
	private const OPTION_KEY = '_allfb_settings';

	/**
	 * Default values for every setting key.
	 *
	 * This constant is the single source of truth for:
	 *   - Which keys are considered valid (unknown keys are silently dropped)
	 *   - The type used for sanitisation (bool → cast to bool, int → cast to int, etc.)
	 *   - The fallback when a stored value is absent
	 *
	 * @var array<string, mixed>
	 * @since 1.0.0
	 */
	private const DEFAULTS = [
		// ── Widget Appearance ──────────────────────────────────────────────
		'widget_color'         => '#6366F1',      // Primary accent colour (hex string)
		'widget_position'      => 'bottom-right', // Trigger button placement on the page
		'widget_trigger'       => 'auto',         // How the widget surfaces to visitors
		'widget_delay'         => 0,              // Seconds before auto-show (trigger = auto)
		'scroll_threshold'     => 50,             // % scrolled before showing (trigger = scroll)
		'show_on_mobile'       => true,           // Render widget on mobile viewports

		// ── User Privacy ───────────────────────────────────────────────────
		'disable_user_details' => false,          // Skip storing IP address and User-Agent

		// ── Logging ────────────────────────────────────────────────────────
		'logging_enabled'      => false,          // Master switch for plugin event logging
		'log_level'            => 'error',        // Minimum severity to record
		'log_retention_days'   => 30,             // Days before log entries are auto-pruned

		// ── Plugin Management ──────────────────────────────────────────────
		'delete_on_uninstall'  => false,          // Wipe all data on plugin deletion
		'allow_usage_tracking' => true,           // Share anonymised usage stats with HQ
	];

	/**
	 * Allowed values for string settings that must come from a fixed set.
	 *
	 * Used by sanitize() to fall back to the default when an invalid value
	 * is supplied. Also consumed by getSchema() to populate REST API `enum`
	 * constraints so WordPress rejects bad values before they reach the service.
	 *
	 * Pro add-ons that need to expand an enum (e.g. add a new trigger type)
	 * should filter the schema array returned by getSchema() rather than
	 * modifying this constant directly.
	 *
	 * @var array<string, string[]>
	 * @since 1.0.0
	 */
	private const ENUMS = [
		'widget_position' => [ 'bottom-right', 'bottom-left', 'side-tab' ],
		'widget_trigger'  => [ 'auto', 'scroll', 'exit-intent', 'manual' ],
		'log_level'       => [ 'error', 'warning', 'info', 'debug' ],
	];

	/**
	 * In-memory cache of merged settings (defaults + stored values).
	 *
	 * Null until the first read triggers a DB load. Busted on every write.
	 *
	 * @var array<string, mixed>|null
	 * @since 1.0.0
	 */
	private ?array $loaded = null;

	// ------------------------------------------------------------------
	// Reads
	// ------------------------------------------------------------------

	/**
	 * Get a single setting by key, or all settings when key is null.
	 *
	 * Falls back to the DEFAULTS value when the key is not stored.
	 * Returns null for unknown keys that are not in DEFAULTS.
	 *
	 * @param string|null $key Setting key. Null returns the full settings array.
	 * @return mixed Single value, or array<string, mixed> for all settings.
	 * @since 1.0.0
	 */
	public function get( ?string $key = null ): mixed {
		$all = $this->all();

		if ( $key === null || $key === '' ) {
			return $all;
		}

		return $all[ $key ] ?? self::DEFAULTS[ $key ] ?? null;
	}

	/**
	 * Return all settings merged with their defaults.
	 *
	 * Only keys present in DEFAULTS are included in the result — stale keys
	 * leftover from an older schema version are automatically excluded.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function all(): array {
		if ( $this->loaded === null ) {
			$stored       = get_option( self::OPTION_KEY, [] );
			$this->loaded = is_array( $stored ) ? $stored : [];
		}

		// array_intersect_key ensures only valid keys survive the merge.
		return array_merge(
			self::DEFAULTS,
			array_intersect_key( $this->loaded, self::DEFAULTS )
		);
	}

	/**
	 * Return the raw defaults array.
	 *
	 * Useful for feature flags, reset operations, or exposing the defaults
	 * to the REST layer without reading from the database.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function getDefaults(): array {
		return self::DEFAULTS;
	}

	// ------------------------------------------------------------------
	// Writes
	// ------------------------------------------------------------------

	/**
	 * Persist a single setting value.
	 *
	 * Keys that are not defined in DEFAULTS are silently ignored, preventing
	 * unknown settings from polluting the options table.
	 * The value is sanitised before it is written.
	 *
	 * @param string $key   Setting key.
	 * @param mixed  $value Raw (unsanitised) value.
	 * @return void
	 * @since 1.0.0
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
	 * Persist multiple settings in a single atomic database write.
	 *
	 * Keys that are not defined in DEFAULTS are silently filtered out before
	 * any values are written, so callers can pass an entire request payload
	 * without pre-filtering.
	 *
	 * @param array<string, mixed> $settings Map of setting key → raw (unsanitised) value.
	 * @return void
	 * @since 1.0.0
	 */
	public function setMultiple( array $settings ): void {
		$all     = $this->all();
		$allowed = array_intersect_key( $settings, self::DEFAULTS );

		foreach ( $allowed as $key => $value ) {
			$all[ $key ] = $this->sanitize( $key, $value );
		}

		$this->persist( $all );
	}

	/**
	 * Reset all settings back to their default values.
	 *
	 * Deletes the option row entirely so that the next call to all() returns
	 * a pristine defaults array without reading stale data.
	 *
	 * @return void
	 * @since 1.0.0
	 */
	public function reset(): void {
		delete_option( self::OPTION_KEY );
		$this->loaded = null;

		/**
		 * Action: allfeedback:settings:reset
		 *
		 * Fires after all plugin-wide settings have been reset to their defaults.
		 *
		 * @since 1.0.0
		 */
		$this->doAction( 'allfeedback:settings:reset' );
	}

	// ------------------------------------------------------------------
	// Schema
	// ------------------------------------------------------------------

	/**
	 * Return a REST-API-compatible schema describing every exposed setting.
	 *
	 * Used by SettingsController in two ways:
	 *   - settingsArgs() — builds WP REST arg descriptors for request validation
	 *   - getPublicItemSchema() — builds the JSON Schema block returned with GET /settings
	 *
	 * Add an entry here whenever a DEFAULTS key should be accessible via the API.
	 * The `type`, `enum`, `minimum`, and `maximum` fields are automatically mapped
	 * to the correct WP REST arg builder (argBoolean / argInteger / argEnum / argString).
	 *
	 * Pro add-ons can extend the schema via the `allfeedback_settings_schema` filter:
	 *
	 * ```php
	 * add_filter( 'allfeedback_settings_schema', function ( array $schema ): array {
	 *     $schema['my_pro_setting'] = [
	 *         'type'        => 'boolean',
	 *         'default'     => false,
	 *         'description' => 'Enable the pro feature.',
	 *     ];
	 *     return $schema;
	 * } );
	 * ```
	 *
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	public function getSchema(): array {
		$schema = [
			// ── Widget Appearance ──────────────────────────────────────────
			'widget_color'         => [
				'type'        => 'string',
				'default'     => self::DEFAULTS['widget_color'],
				'description' => __( 'Primary accent colour for the survey widget (hex string, e.g. #6366F1).', 'all-feedback' ),
			],
			'widget_position'      => [
				'type'        => 'string',
				'default'     => self::DEFAULTS['widget_position'],
				'enum'        => self::ENUMS['widget_position'],
				'description' => __( 'Position of the widget trigger button on the page. One of: bottom-right, bottom-left, side-tab.', 'all-feedback' ),
			],
			'widget_trigger'       => [
				'type'        => 'string',
				'default'     => self::DEFAULTS['widget_trigger'],
				'enum'        => self::ENUMS['widget_trigger'],
				'description' => __( 'How the widget surfaces to visitors. auto = after delay; scroll = after scroll depth; exit-intent = on cursor leave; manual = JavaScript API only.', 'all-feedback' ),
			],
			'widget_delay'         => [
				'type'        => 'integer',
				'default'     => self::DEFAULTS['widget_delay'],
				'minimum'     => 0,
				'maximum'     => 3600,
				'description' => __( 'Seconds to wait before auto-showing the widget. Applies when widget_trigger = auto.', 'all-feedback' ),
			],
			'scroll_threshold'     => [
				'type'        => 'integer',
				'default'     => self::DEFAULTS['scroll_threshold'],
				'minimum'     => 0,
				'maximum'     => 100,
				'description' => __( 'Percentage of the page scrolled before the widget appears. Applies when widget_trigger = scroll.', 'all-feedback' ),
			],
			'show_on_mobile'       => [
				'type'        => 'boolean',
				'default'     => self::DEFAULTS['show_on_mobile'],
				'description' => __( 'Show the survey widget on mobile devices.', 'all-feedback' ),
			],

			// ── User Privacy ───────────────────────────────────────────────
			'disable_user_details' => [
				'type'        => 'boolean',
				'default'     => self::DEFAULTS['disable_user_details'],
				'description' => __( 'Disable storing the visitor\'s IP address and User-Agent string on all surveys. Enabling this removes the ability to detect duplicate submissions.', 'all-feedback' ),
			],

			// ── Logging ────────────────────────────────────────────────────
			'logging_enabled'      => [
				'type'        => 'boolean',
				'default'     => self::DEFAULTS['logging_enabled'],
				'description' => __( 'Enable plugin event logging. When false, no log entries are written regardless of log_level.', 'all-feedback' ),
			],
			'log_level'            => [
				'type'        => 'string',
				'default'     => self::DEFAULTS['log_level'],
				'enum'        => self::ENUMS['log_level'],
				'description' => __( 'Minimum severity level to record. error = errors only; debug = all events (verbose).', 'all-feedback' ),
			],
			'log_retention_days'   => [
				'type'        => 'integer',
				'default'     => self::DEFAULTS['log_retention_days'],
				'minimum'     => 1,
				'maximum'     => 365,
				'description' => __( 'Number of days before log entries are automatically purged. Must be between 1 and 365.', 'all-feedback' ),
			],

			// ── Plugin Management ──────────────────────────────────────────
			'delete_on_uninstall'  => [
				'type'        => 'boolean',
				'default'     => self::DEFAULTS['delete_on_uninstall'],
				'description' => __( 'Permanently delete all surveys, responses, and settings when the plugin is uninstalled. Irreversible.', 'all-feedback' ),
			],
			'allow_usage_tracking' => [
				'type'        => 'boolean',
				'default'     => self::DEFAULTS['allow_usage_tracking'],
				'description' => __( 'Share anonymised usage statistics with the AllFeedback team to help improve the plugin. No personal data is transmitted.', 'all-feedback' ),
			],
		];

		/**
		 * Filter: allfeedback_settings_schema
		 *
		 * Allows pro add-ons or third-party plugins to append additional settings
		 * to the schema without modifying this class. Each entry must follow the
		 * same shape: `type`, `default`, `description`, and optionally `enum`,
		 * `minimum`, `maximum`.
		 *
		 * @param array<string, array<string, mixed>> $schema Existing schema map.
		 * @return array<string, array<string, mixed>> Extended schema map.
		 * @since 1.0.0
		 */
		return (array) apply_filters( 'allfeedback_settings_schema', $schema );
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Sanitise a raw incoming value for the given setting key.
	 *
	 * The sanitisation strategy is driven by the type of the corresponding
	 * DEFAULTS entry:
	 *
	 *   boolean → (bool) cast
	 *   integer → (int) cast
	 *   string  → sanitize_text_field() + optional enum validation
	 *
	 * For enum settings, an invalid value silently falls back to the default
	 * rather than throwing, keeping the API lenient while remaining safe.
	 *
	 * @param string $key   Setting key (must exist in DEFAULTS).
	 * @param mixed  $value Raw value from the request or caller.
	 * @return mixed Sanitised value cast to the appropriate PHP type.
	 * @since 1.0.0
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
			$sanitised = is_string( $value )
				? sanitize_text_field( $value )
				: (string) $value;

			// Reject invalid enum values — fall back to the default silently.
			if ( isset( self::ENUMS[ $key ] ) && ! in_array( $sanitised, self::ENUMS[ $key ], true ) ) {
				return self::DEFAULTS[ $key ];
			}

			return $sanitised;
		}

		return $value;
	}

	/**
	 * Write the merged settings array to the database and bust the in-memory cache.
	 *
	 * autoload is set to false because these settings are only needed on
	 * admin pages — loading them on every frontend request wastes memory.
	 *
	 * @param array<string, mixed> $settings Merged, already-sanitised settings array.
	 * @return void
	 * @since 1.0.0
	 */
	private function persist( array $settings ): void {
		// Strip unknown keys to keep the option row clean.
		$toStore = array_intersect_key( $settings, self::DEFAULTS );

		// autoload: false — these settings are admin-only, no need to load on frontend.
		update_option( self::OPTION_KEY, $toStore, false );

		// Bust in-memory cache so the next read reflects the new values immediately.
		$this->loaded = $toStore;

		/**
		 * Action: allfeedback:settings:updated
		 *
		 * Fires after plugin-wide settings are persisted to the database.
		 * Use this hook to invalidate caches, sync to external services,
		 * or apply side-effects (e.g. reconfiguring logger verbosity).
		 *
		 * @param array<string, mixed> $toStore The saved, sanitised settings array.
		 * @since 1.0.0
		 */
		$this->doAction( 'allfeedback:settings:updated', $toStore );
	}
}
