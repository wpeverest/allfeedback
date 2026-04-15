<?php

declare(strict_types=1);

namespace AllFeedback\Core\Settings;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Traits\Hooks;

/**
 * Class SettingsManager
 *
 * Three-level grouped plugin settings stored in a single wp_options row.
 *
 * ── Structure ─────────────────────────────────────────────────────────
 *
 *   Level 1 — Page    (maps to a Settings nav tab: general, advanced)
 *   Level 2 — Section (maps to a UI section: widget, privacy, logging, plugin)
 *   Level 3 — Field   (individual setting: color, enabled, level…)
 *
 *   Stored / returned shape:
 *   {
 *     "general":  { "widget":  { "color": "#6366F1", "position": "bottom-right", … } },
 *     "advanced": { "privacy": { "disable_user_details": false },
 *                   "logging": { "enabled": false, "level": "error", "retention_days": 30 },
 *                   "plugin":  { "delete_on_uninstall": false, "allow_usage_tracking": true } }
 *   }
 *
 * ── Dot-notation access ───────────────────────────────────────────────
 *
 *   get()                                → full nested array
 *   get('general')                       → { widget: {…} }
 *   get('general.widget')                → { color: '…', position: '…', … }
 *   get('general.widget.color')          → '#6366F1'
 *   set('general.widget.color', '#F00')  → persist single field
 *   setSection('advanced','logging', ['enabled' => true])
 *   setMultiple(['advanced' => ['logging' => ['enabled' => true]]])
 *
 * ── How to add a field ────────────────────────────────────────────────
 *
 *   1. Add key + default to the correct page → section in DEFAULTS.
 *   2. If constrained to a fixed set, add to ENUMS[page][section][field].
 *   3. Add matching entry in getSchema()[page]['sections'][section]['properties'].
 *
 * ── How to add a section or page (Pro add-on) ────────────────────────
 *
 *   add_filter( 'allfeedback_settings_schema', function ( array $schema ): array {
 *       $schema['advanced']['sections']['notifications'] = [
 *           'description' => 'Email notification settings.',
 *           'properties'  => [
 *               'enabled' => [ 'type' => 'boolean', 'default' => false,
 *                              'description' => 'Send email on new response.' ],
 *               'email'   => [ 'type' => 'string',  'default' => '',
 *                              'description' => 'Recipient address.' ],
 *           ],
 *       ];
 *       return $schema;
 *   } );
 *
 * @package AllFeedback\Core\Settings
 * @since   1.0.0
 */
class SettingsManager {

	use Hooks;

	/**
	 * WordPress option key. All pages → sections → fields live here.
	 *
	 * @since 1.0.0
	 */
	private const OPTION_KEY = '_allfb_settings';

	/**
	 * Default values, organised as page → section → field.
	 *
	 * This is the single source of truth for:
	 *   - Which keys are valid (unknown keys are silently dropped)
	 *   - The PHP type that drives sanitisation
	 *   - The fallback value when a key is absent from storage
	 *
	 * @var array<string, array<string, array<string, mixed>>>
	 * @since 1.0.0
	 */
	private const DEFAULTS = [

		// ── General page ──────────────────────────────────────────────────
		'general'  => [
			'widget' => [
				'color'            => '#6366F1',       // Hex accent colour
				'position'         => 'bottom-right',  // Trigger button placement on page
				'trigger'          => 'auto',          // How the widget surfaces to visitors
				'delay'            => 0,               // Seconds before auto-show (trigger = auto)
				'scroll_threshold' => 50,              // % scrolled before show (trigger = scroll)
				'show_on_mobile'   => true,            // Render on mobile viewports
			],
		],

		// ── Advanced page ─────────────────────────────────────────────────
		'advanced' => [
			'privacy' => [
				'disable_user_details' => false,       // Skip storing IP / User-Agent
			],
			'logging' => [
				'enabled'        => false,             // Master switch
				'level'          => 'debug',           // Minimum severity to record (debug = capture everything)
				'retention_days' => 30,                // Days before auto-prune
			],
			'plugin'  => [
				'delete_on_uninstall'  => false,       // Wipe all data on deletion
				'allow_usage_tracking' => true,        // Share anonymised stats
			],
		],
	];

	/**
	 * Allowed string values per page → section → field.
	 *
	 * An incoming value not in the list falls back to the DEFAULTS value
	 * silently, keeping the API lenient while remaining safe.
	 *
	 * @var array<string, array<string, array<string, string[]>>>
	 * @since 1.0.0
	 */
	private const ENUMS = [
		'general'  => [
			'widget' => [
				'position' => [ 'bottom-right', 'bottom-left', 'side-tab' ],
				'trigger'  => [ 'auto', 'scroll', 'exit-intent', 'manual' ],
			],
		],
		'advanced' => [
			'logging' => [
				'level' => [ 'error', 'warning', 'info', 'debug' ],
			],
		],
	];

	/**
	 * In-memory cache. Null until first DB read; busted on every write.
	 *
	 * @var array<string, array<string, array<string, mixed>>>|null
	 * @since 1.0.0
	 */
	private ?array $loaded = null;

	/**
	 * Cached result of the allfeedback_settings_defaults filter.
	 *
	 * Computed once per request so filter callbacks do not run on every read/write.
	 * Reset to null whenever a write occurs so pro defaults stay consistent.
	 *
	 * @var array<string, array<string, array<string, mixed>>>|null
	 * @since 1.0.0
	 */
	private ?array $effectiveDefaults = null;

	// ------------------------------------------------------------------
	// Reads
	// ------------------------------------------------------------------

	/**
	 * Return all settings merged with defaults.
	 *
	 * Only page/section/field keys present in DEFAULTS survive the merge —
	 * stale keys from older schema versions are automatically excluded.
	 *
	 * @return array<string, array<string, array<string, mixed>>>
	 * @since 1.0.0
	 */
	public function all(): array {
		if ( $this->loaded === null ) {
			$stored       = get_option( self::OPTION_KEY, [] );
			$this->loaded = is_array( $stored ) ? $stored : [];
		}

		return $this->mergeWithDefaults( $this->loaded );
	}

	/**
	 * Get settings using dot notation.
	 *
	 * Examples:
	 *   get()                            → full nested array (all pages)
	 *   get('general')                   → { widget: {…} }
	 *   get('general.widget')            → { color: '…', position: '…', … }
	 *   get('general.widget.color')      → '#6366F1'
	 *   get('advanced.logging.enabled')  → false
	 *
	 * @param string|null $key Null, a page, a "page.section", or "page.section.field".
	 * @return mixed
	 * @since 1.0.0
	 */
	public function get( ?string $key = null ): mixed {
		$all = $this->all();

		if ( $key === null || $key === '' ) {
			return $all;
		}

		$parts = explode( '.', $key, 3 );

		$defaults = $this->getDefaults();

		return match ( count( $parts ) ) {
			1 => $all[ $parts[0] ] ?? null,
			2 => $all[ $parts[0] ][ $parts[1] ] ?? null,
			3 => $all[ $parts[0] ][ $parts[1] ][ $parts[2] ]
				?? $defaults[ $parts[0] ][ $parts[1] ][ $parts[2] ]
				?? null,
			default => null,
		};
	}

	/**
	 * Return the effective defaults — core DEFAULTS merged with any additions
	 * registered by pro add-ons via the `allfeedback_settings_defaults` filter.
	 *
	 * Result is cached per request. Pro add-ons must add their defaults at
	 * the same three-level structure as core:
	 *
	 * ```php
	 * add_filter( 'allfeedback_settings_defaults', function ( array $defaults ): array {
	 *     $defaults['advanced']['notifications'] = [
	 *         'enabled' => false,
	 *         'email'   => '',
	 *     ];
	 *     return $defaults;
	 * } );
	 * ```
	 *
	 * Adding a field here AND to `allfeedback_settings_schema` is enough to
	 * make it fully functional: stored, merged, sanitised, and validated.
	 *
	 * @return array<string, array<string, array<string, mixed>>>
	 * @since 1.0.0
	 */
	public function getDefaults(): array {
		if ( $this->effectiveDefaults !== null ) {
			return $this->effectiveDefaults;
		}

		/**
		 * Filter: allfeedback_settings_defaults
		 *
		 * Allows pro add-ons to register new pages, sections, or fields so
		 * they are included in storage, retrieval, and sanitisation — not just
		 * REST validation. Must follow the page → section → field structure.
		 *
		 * @param array<string, array<string, array<string, mixed>>> $defaults Core defaults.
		 * @return array<string, array<string, array<string, mixed>>>
		 * @since 1.0.0
		 */
		$this->effectiveDefaults = (array) apply_filters( 'allfeedback_settings_defaults', self::DEFAULTS );

		return $this->effectiveDefaults;
	}

	// ------------------------------------------------------------------
	// Writes
	// ------------------------------------------------------------------

	/**
	 * Persist a single field using dot notation ("page.section.field").
	 *
	 * Silently ignores unknown pages, sections, or fields.
	 *
	 * @param string $key   Dot path with exactly three parts: "page.section.field".
	 * @param mixed  $value Raw unsanitised value.
	 * @return void
	 * @since 1.0.0
	 */
	public function set( string $key, mixed $value ): void {
		$parts = explode( '.', $key, 3 );

		if ( count( $parts ) !== 3 ) {
			return;
		}

		[ $page, $section, $field ] = $parts;

		if ( ! isset( $this->getDefaults()[ $page ][ $section ][ $field ] ) ) {
			return;
		}

		$all                                = $this->all();
		$all[ $page ][ $section ][ $field ] = $this->sanitize( $page, $section, $field, $value );
		$this->persist( $all );
	}

	/**
	 * Persist one or more fields within a single section in an atomic write.
	 *
	 * Example:
	 *   setSection('advanced', 'logging', ['enabled' => true, 'level' => 'debug']);
	 *
	 * Unknown pages, sections, or fields are silently ignored.
	 *
	 * @param string               $page    Page name (e.g. "advanced").
	 * @param string               $section Section name (e.g. "logging").
	 * @param array<string, mixed> $values  Map of field → raw value.
	 * @return void
	 * @since 1.0.0
	 */
	public function setSection( string $page, string $section, array $values ): void {
		$defaults = $this->getDefaults();

		if ( ! isset( $defaults[ $page ][ $section ] ) ) {
			return;
		}

		$all     = $this->all();
		$allowed = array_intersect_key( $values, $defaults[ $page ][ $section ] );

		foreach ( $allowed as $field => $value ) {
			$all[ $page ][ $section ][ $field ] = $this->sanitize( $page, $section, $field, $value );
		}

		$this->persist( $all );
	}

	/**
	 * Persist multiple pages / sections in a single atomic write.
	 *
	 * Input mirrors the full nested GET /settings response shape so callers
	 * can pass an entire PATCH body without pre-filtering:
	 *
	 *   setMultiple([
	 *     'general'  => [ 'widget'  => [ 'color' => '#FF0000' ] ],
	 *     'advanced' => [ 'logging' => [ 'enabled' => true ] ],
	 *   ]);
	 *
	 * Unknown pages, sections, and fields are silently ignored.
	 *
	 * @param array<string, array<string, array<string, mixed>>> $settings Nested input.
	 * @return void
	 * @since 1.0.0
	 */
	public function setMultiple( array $settings ): void {
		$defaults = $this->getDefaults();
		$all      = $this->all();

		foreach ( $settings as $page => $sections ) {
			if ( ! isset( $defaults[ $page ] ) || ! is_array( $sections ) ) {
				continue;
			}

			foreach ( $sections as $section => $values ) {
				if ( ! isset( $defaults[ $page ][ $section ] ) || ! is_array( $values ) ) {
					continue;
				}

				$allowed = array_intersect_key( $values, $defaults[ $page ][ $section ] );

				foreach ( $allowed as $field => $value ) {
					$all[ $page ][ $section ][ $field ] = $this->sanitize( $page, $section, $field, $value );
				}
			}
		}

		$this->persist( $all );
	}

	/**
	 * Reset all settings to defaults by removing the option row.
	 *
	 * @return void
	 * @since 1.0.0
	 */
	public function reset(): void {
		delete_option( self::OPTION_KEY );
		$this->loaded           = null;
		$this->effectiveDefaults = null;

		/**
		 * Action: allfeedback:settings:reset
		 *
		 * Fires after all plugin-wide settings are reset to defaults.
		 *
		 * @since 1.0.0
		 */
		$this->doAction( 'allfeedback:settings:reset' );
	}

	// ------------------------------------------------------------------
	// Schema
	// ------------------------------------------------------------------

	/**
	 * Return a REST-API-compatible schema with three levels: page → section → field.
	 *
	 * Schema shape:
	 * ```
	 * [
	 *   'general' => [
	 *     'description' => '…',
	 *     'sections'    => [
	 *       'widget' => [
	 *         'description' => '…',
	 *         'properties'  => [
	 *           'color' => [ 'type' => 'string', 'default' => '#6366F1', … ],
	 *           …
	 *         ],
	 *       ],
	 *     ],
	 *   ],
	 *   'advanced' => [ … ],
	 * ]
	 * ```
	 *
	 * Adding a field to DEFAULTS + an entry here is enough to expose it
	 * in GET /settings, PATCH /settings validation, and the JSON Schema endpoint.
	 *
	 * Pro add-ons can append sections or pages via `allfeedback_settings_schema`:
	 *
	 * ```php
	 * add_filter( 'allfeedback_settings_schema', function ( array $schema ): array {
	 *     $schema['advanced']['sections']['notifications'] = [
	 *         'description' => 'Email notification settings.',
	 *         'properties'  => [
	 *             'enabled' => [ 'type' => 'boolean', 'default' => false,
	 *                            'description' => 'Send email on new response.' ],
	 *         ],
	 *     ];
	 *     return $schema;
	 * } );
	 * ```
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function getSchema(): array {
		$schema = [

			// ── General ───────────────────────────────────────────────────
			'general'  => [
				'description' => __( 'General settings (widget appearance and behaviour).', 'all-feedback' ),
				'sections'    => [
					'widget' => [
						'description' => __( 'Widget appearance and display settings.', 'all-feedback' ),
						'properties'  => [
							'color'            => [
								'type'        => 'string',
								'default'     => self::DEFAULTS['general']['widget']['color'],
								'description' => __( 'Primary accent colour for the survey widget (hex string, e.g. #6366F1).', 'all-feedback' ),
							],
							'position'         => [
								'type'        => 'string',
								'default'     => self::DEFAULTS['general']['widget']['position'],
								'enum'        => self::ENUMS['general']['widget']['position'],
								'description' => __( 'Trigger button position. One of: bottom-right, bottom-left, side-tab.', 'all-feedback' ),
							],
							'trigger'          => [
								'type'        => 'string',
								'default'     => self::DEFAULTS['general']['widget']['trigger'],
								'enum'        => self::ENUMS['general']['widget']['trigger'],
								'description' => __( 'How the widget surfaces to visitors: auto | scroll | exit-intent | manual.', 'all-feedback' ),
							],
							'delay'            => [
								'type'        => 'integer',
								'default'     => self::DEFAULTS['general']['widget']['delay'],
								'minimum'     => 0,
								'maximum'     => 3600,
								'description' => __( 'Seconds before auto-showing the widget (trigger = auto only).', 'all-feedback' ),
							],
							'scroll_threshold' => [
								'type'        => 'integer',
								'default'     => self::DEFAULTS['general']['widget']['scroll_threshold'],
								'minimum'     => 0,
								'maximum'     => 100,
								'description' => __( 'Page percentage scrolled before the widget appears (trigger = scroll only).', 'all-feedback' ),
							],
							'show_on_mobile'   => [
								'type'        => 'boolean',
								'default'     => self::DEFAULTS['general']['widget']['show_on_mobile'],
								'description' => __( 'Render the survey widget on mobile viewports.', 'all-feedback' ),
							],
						],
					],
				],
			],

			// ── Advanced ──────────────────────────────────────────────────
			'advanced' => [
				'description' => __( 'Advanced settings (privacy, logging, and plugin management).', 'all-feedback' ),
				'sections'    => [
					'privacy' => [
						'description' => __( 'Visitor privacy and data-collection settings.', 'all-feedback' ),
						'properties'  => [
							'disable_user_details' => [
								'type'        => 'boolean',
								'default'     => self::DEFAULTS['advanced']['privacy']['disable_user_details'],
								'description' => __( 'Disable storing the visitor IP address and User-Agent on all surveys. Also disables duplicate-submission detection.', 'all-feedback' ),
							],
						],
					],
					'logging' => [
						'description' => __( 'Plugin event logging settings.', 'all-feedback' ),
						'properties'  => [
							'enabled'        => [
								'type'        => 'boolean',
								'default'     => self::DEFAULTS['advanced']['logging']['enabled'],
								'description' => __( 'Master switch for plugin event logging.', 'all-feedback' ),
							],
							'level'          => [
								'type'        => 'string',
								'default'     => self::DEFAULTS['advanced']['logging']['level'],
								'enum'        => self::ENUMS['advanced']['logging']['level'],
								'description' => __( 'Minimum severity to record. error = errors only; debug = all events.', 'all-feedback' ),
							],
							'retention_days' => [
								'type'        => 'integer',
								'default'     => self::DEFAULTS['advanced']['logging']['retention_days'],
								'minimum'     => 1,
								'maximum'     => 365,
								'description' => __( 'Days before log entries are automatically purged (1–365).', 'all-feedback' ),
							],
						],
					],
					'plugin'  => [
						'description' => __( 'Plugin lifecycle and usage-tracking settings.', 'all-feedback' ),
						'properties'  => [
							'delete_on_uninstall'  => [
								'type'        => 'boolean',
								'default'     => self::DEFAULTS['advanced']['plugin']['delete_on_uninstall'],
								'description' => __( 'Permanently delete all surveys, responses, and settings on uninstall. Irreversible.', 'all-feedback' ),
							],
							'allow_usage_tracking' => [
								'type'        => 'boolean',
								'default'     => self::DEFAULTS['advanced']['plugin']['allow_usage_tracking'],
								'description' => __( 'Share anonymised usage statistics with the AllFeedback team. No personal data is transmitted.', 'all-feedback' ),
							],
						],
					],
				],
			],
		];

		/**
		 * Filter: allfeedback_settings_schema
		 *
		 * Allows pro add-ons to extend the settings schema without modifying
		 * this class. Entries must follow the page → sections → properties shape.
		 *
		 * @param array<string, mixed> $schema Existing schema.
		 * @return array<string, mixed>
		 * @since 1.0.0
		 */
		return (array) apply_filters( 'allfeedback_settings_schema', $schema );
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Deep-merge stored values with DEFAULTS at all three levels.
	 *
	 * @param array<string, mixed> $stored Raw value from get_option().
	 * @return array<string, array<string, array<string, mixed>>>
	 * @since 1.0.0
	 */
	private function mergeWithDefaults( array $stored ): array {
		$merged = [];

		foreach ( $this->getDefaults() as $page => $sections ) {
			$merged[ $page ] = [];

			foreach ( $sections as $section => $fields ) {
				$storedSection = isset( $stored[ $page ][ $section ] )
					&& is_array( $stored[ $page ][ $section ] )
					? $stored[ $page ][ $section ]
					: [];

				$merged[ $page ][ $section ] = array_merge(
					$fields,
					array_intersect_key( $storedSection, $fields )
				);
			}
		}

		return $merged;
	}

	/**
	 * Sanitise a single field value.
	 *
	 * Type is inferred from the PHP type of the matching DEFAULTS value:
	 *   bool   → (bool) cast
	 *   int    → (int) cast
	 *   string → sanitize_text_field() + optional enum guard
	 *
	 * @param string $page    Page name.
	 * @param string $section Section name.
	 * @param string $field   Field name.
	 * @param mixed  $value   Raw unsanitised value.
	 * @return mixed Sanitised, correctly-typed value.
	 * @since 1.0.0
	 */
	private function sanitize( string $page, string $section, string $field, mixed $value ): mixed {
		$default = $this->getDefaults()[ $page ][ $section ][ $field ] ?? null;

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

			// Reject invalid enum values — fall back to field default.
			if (
				isset( self::ENUMS[ $page ][ $section ][ $field ] ) &&
				! in_array( $sanitised, self::ENUMS[ $page ][ $section ][ $field ], true )
			) {
				return $this->getDefaults()[ $page ][ $section ][ $field ];
			}

			// Validate hex color fields (must be #rrggbb or #rgb).
			if ( $field === 'color' && ! preg_match( '/^#([0-9a-fA-F]{3}){1,2}$/', $sanitised ) ) {
				return $this->getDefaults()[ $page ][ $section ][ $field ];
			}

			return $sanitised;
		}

		return $value;
	}

	/**
	 * Atomically write the merged settings array and bust the in-memory cache.
	 *
	 * autoload is false — settings are admin-only; no reason to load on every
	 * frontend page request.
	 *
	 * @param array<string, array<string, array<string, mixed>>> $settings Merged, sanitised array.
	 * @return void
	 * @since 1.0.0
	 */
	private function persist( array $settings ): void {
		// Strip any pages not in effective defaults to keep the option row clean.
		$toStore = array_intersect_key( $settings, $this->getDefaults() );

		update_option( self::OPTION_KEY, $toStore, false ); // autoload = false
		$this->loaded = $toStore;

		/**
		 * Action: allfeedback:settings:updated
		 *
		 * Fires after settings are persisted. Use to flush caches, sync to
		 * external services, or react to specific setting changes.
		 *
		 * @param array<string, array<string, array<string, mixed>>> $toStore Saved settings.
		 * @since 1.0.0
		 */
		$this->doAction( 'allfeedback:settings:updated', $toStore );
	}
}
