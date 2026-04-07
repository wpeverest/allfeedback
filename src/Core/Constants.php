<?php

declare(strict_types=1);

namespace AllFeedback\Core;

/**
 * Class Constants
 *
 * Central store for plugin-wide constants and path/URL helpers.
 * Call Constants::init( __FILE__ ) once from the main plugin file.
 */
final class Constants {

	// ------------------------------------------------------------------
	// Versioning & identity
	// ------------------------------------------------------------------

	/** Current plugin version — bump on every release. */
	public const VERSION         = '1.0.0';

	/** WordPress text domain used for translations. */
	public const TEXT_DOMAIN     = 'all-feedback';

	/** Minimum PHP version required to activate. */
	public const MIN_PHP_VERSION = '8.2';

	/** Minimum WordPress version required to activate. */
	public const MIN_WP_VERSION  = '6.5';

	// ------------------------------------------------------------------
	// Runtime-resolved values (set by init())
	// ------------------------------------------------------------------

	private static ?string $pluginFile     = null;
	private static ?string $pluginPath     = null;
	private static ?string $pluginUrl      = null;
	private static ?string $pluginBasename = null;

	/** Current environment: 'production' (default) or 'development'. */
	private static string $environment = 'production';

	// ------------------------------------------------------------------
	// Bootstrap
	// ------------------------------------------------------------------

	/**
	 * Resolve all path/URL constants from the main plugin file.
	 * Must be called once from all-feedback.php.
	 *
	 * @param string $pluginFile Absolute path to the main plugin file.
	 */
	public static function init( string $pluginFile ): void {
		self::$pluginFile     = $pluginFile;
		self::$pluginPath     = plugin_dir_path( $pluginFile );
		self::$pluginUrl      = plugin_dir_url( $pluginFile );
		self::$pluginBasename = plugin_basename( $pluginFile );

		// Detect environment via a constant defined in wp-config.php:
		//   define( 'RMB_ENV', 'development' );
		self::$environment = defined( 'RMB_ENV' ) ? (string) constant( 'RMB_ENV' ) : 'production';
	}

	// ------------------------------------------------------------------
	// Accessors
	// ------------------------------------------------------------------

	public static function version(): string {
		return self::VERSION;
	}

	public static function textDomain(): string {
		return self::TEXT_DOMAIN;
	}

	/** Absolute path to the main plugin file. */
	public static function pluginFile(): string {
		return self::$pluginFile ?? '';
	}

	/** Absolute path to the plugin directory (trailing slash included). */
	public static function pluginPath(): string {
		return self::$pluginPath ?? '';
	}

	/** Public URL to the plugin directory (trailing slash included). */
	public static function pluginUrl(): string {
		return self::$pluginUrl ?? '';
	}

	/** Plugin basename, e.g. "all-feedback/all-feedback.php". */
	public static function pluginBasename(): string {
		return self::$pluginBasename ?? '';
	}

	/** Current environment string ('production' | 'development'). */
	public static function environment(): string {
		return self::$environment;
	}

	/**
	 * Build an absolute filesystem path relative to the plugin root.
	 *
	 * @param string $relativePath e.g. 'src/Admin/AdminServiceProvider.php'
	 */
	public static function path( string $relativePath = '' ): string {
		return self::pluginPath() . ltrim( $relativePath, '/' );
	}

	/**
	 * Build a public URL relative to the plugin root.
	 *
	 * @param string $relativePath e.g. 'resources/build/admin.js'
	 */
	public static function url( string $relativePath = '' ): string {
		return self::pluginUrl() . ltrim( $relativePath, '/' );
	}

	// ------------------------------------------------------------------
	// Requirement checks
	// ------------------------------------------------------------------

	/** Returns true when the server's PHP version satisfies MIN_PHP_VERSION. */
	public static function meetsPHPRequirement(): bool {
		return version_compare( PHP_VERSION, self::MIN_PHP_VERSION, '>=' );
	}

	/** Returns true when the installed WordPress satisfies MIN_WP_VERSION. */
	public static function meetsWPRequirement(): bool {
		global $wp_version;
		return version_compare( $wp_version, self::MIN_WP_VERSION, '>=' );
	}
}
