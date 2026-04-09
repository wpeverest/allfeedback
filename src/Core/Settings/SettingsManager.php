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
		// ── Notifications ─────────────────────────────────────────────
		'email_notifications' => false,       // Send email when a new response arrives
		'notification_email'  => '',          // Recipient; empty = admin_email

		// ── Defaults for new surveys ──────────────────────────────────
		'default_position'    => 'bottom-right', // bottom-right | bottom-left | center | full-page
		'default_trigger'     => 'immediate',    // immediate | time_delay | scroll | exit_intent
		'default_trigger_delay' => 5,            // seconds; applies when trigger = time_delay
		'default_require_consent' => false,      // Pre-tick GDPR consent on new surveys

		// ── Data & Privacy ────────────────────────────────────────────
		'data_retention_days' => 0,           // Days before responses are auto-deleted; 0 = keep forever
		'anonymize_ip'        => true,        // Store IP as one-way hash (always true for GDPR)

		// ── Branding ──────────────────────────────────────────────────
		'branding_enabled'    => true,        // Show "Powered by AllFeedback" badge on widget
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
			// ── Notifications ─────────────────────────────────────────
			'email_notifications'      => [
				'type'        => 'boolean',
				'default'     => self::DEFAULTS['email_notifications'],
				'description' => __( 'Send an email notification when a new response is received.', 'all-feedback' ),
			],
			'notification_email'       => [
				'type'        => 'string',
				'default'     => self::DEFAULTS['notification_email'],
				'description' => __( 'Email address to notify. Defaults to the site admin email when empty.', 'all-feedback' ),
			],

			// ── Defaults for new surveys ──────────────────────────────
			'default_position'         => [
				'type'        => 'string',
				'default'     => self::DEFAULTS['default_position'],
				'enum'        => [ 'bottom-right', 'bottom-left', 'center', 'full-page' ],
				'description' => __( 'Default display position applied to newly created surveys.', 'all-feedback' ),
			],
			'default_trigger'          => [
				'type'        => 'string',
				'default'     => self::DEFAULTS['default_trigger'],
				'enum'        => [ 'immediate', 'time_delay', 'scroll', 'exit_intent' ],
				'description' => __( 'Default trigger type applied to newly created surveys.', 'all-feedback' ),
			],
			'default_trigger_delay'    => [
				'type'        => 'integer',
				'default'     => self::DEFAULTS['default_trigger_delay'],
				'minimum'     => 0,
				'maximum'     => 3600,
				'description' => __( 'Default trigger delay in seconds (used when trigger = time_delay).', 'all-feedback' ),
			],
			'default_require_consent'  => [
				'type'        => 'boolean',
				'default'     => self::DEFAULTS['default_require_consent'],
				'description' => __( 'Pre-enable the GDPR consent checkbox on newly created surveys.', 'all-feedback' ),
			],

			// ── Data & Privacy ────────────────────────────────────────
			'data_retention_days'      => [
				'type'        => 'integer',
				'default'     => self::DEFAULTS['data_retention_days'],
				'minimum'     => 0,
				'maximum'     => 3650,
				'description' => __( 'Days before responses are automatically deleted. 0 keeps data forever.', 'all-feedback' ),
			],
			'anonymize_ip'             => [
				'type'        => 'boolean',
				'default'     => self::DEFAULTS['anonymize_ip'],
				'description' => __( 'Store visitor IP addresses as a one-way hash (recommended for GDPR).', 'all-feedback' ),
			],

			// ── Branding ──────────────────────────────────────────────
			'branding_enabled'         => [
				'type'        => 'boolean',
				'default'     => self::DEFAULTS['branding_enabled'],
				'description' => __( 'Show "Powered by AllFeedback" badge on the public-facing survey widget.', 'all-feedback' ),
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
		 * Action: allfeedback:settings:updated
		 *
		 * Fires after settings are persisted.
		 *
		 * @param array<string, mixed> $toStore The saved settings array.
		 */
		$this->doAction( 'allfeedback:settings:updated', $toStore );
	}
}
