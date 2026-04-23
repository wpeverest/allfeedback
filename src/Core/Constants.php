<?php

declare(strict_types=1);

namespace AllFeedback\Core;

/**
 * Central store for plugin-wide constants and path/URL helpers.
 *
 * Call `Constants::init( __FILE__ )` once from the main plugin file to
 * resolve all runtime path and URL values before the plugin boots.
 *
 * @package AllFeedback\Core
 * @since   1.0.0
 */
final class Constants {

	/**
	 * Current plugin version — bump on every release.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	public const VERSION = '1.0.0';

	/**
	 * WordPress text domain used for translations.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	public const TEXT_DOMAIN = 'all-feedback';

	/**
	 * Minimum PHP version required to activate.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	public const MIN_PHP_VERSION = '8.2';

	/**
	 * Minimum WordPress version required to activate.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	public const MIN_WP_VERSION = '6.5';

	/**
	 * Absolute path to the main plugin file.
	 *
	 * @var string|null
	 * @since 1.0.0
	 */
	private static ?string $pluginFile = null;

	/**
	 * Absolute path to the plugin directory (trailing slash included).
	 *
	 * @var string|null
	 * @since 1.0.0
	 */
	private static ?string $pluginPath = null;

	/**
	 * Public URL to the plugin directory (trailing slash included).
	 *
	 * @var string|null
	 * @since 1.0.0
	 */
	private static ?string $pluginUrl = null;

	/**
	 * Plugin basename, e.g. `all-feedback/all-feedback.php`.
	 *
	 * @var string|null
	 * @since 1.0.0
	 */
	private static ?string $pluginBasename = null;

	/**
	 * Current environment: `'production'` (default) or `'development'`.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private static string $environment = 'production';

	/**
	 * Resolve all path and URL constants from the main plugin file.
	 *
	 * Must be called once from `all-feedback.php` before the plugin boots.
	 *
	 * @param  string $pluginFile Absolute path to the main plugin file.
	 * @return void
	 * @since  1.0.0
	 */
	public static function init( string $pluginFile ): void {
		self::$pluginFile     = $pluginFile;
		self::$pluginPath     = plugin_dir_path( $pluginFile );
		self::$pluginUrl      = plugin_dir_url( $pluginFile );
		self::$pluginBasename = plugin_basename( $pluginFile );

		self::$environment = defined( 'ALLFEEDBACK_ENV' ) ? (string) constant( 'ALLFEEDBACK_ENV' ) : 'production';
	}

	/**
	 * Return the current plugin version string.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public static function version(): string {
		return self::VERSION;
	}

	/**
	 * Return the WordPress text domain.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public static function textDomain(): string {
		return self::TEXT_DOMAIN;
	}

	/**
	 * Return the absolute path to the main plugin file.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public static function pluginFile(): string {
		return self::$pluginFile ?? '';
	}

	/**
	 * Return the absolute path to the plugin directory (trailing slash included).
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public static function pluginPath(): string {
		return self::$pluginPath ?? '';
	}

	/**
	 * Return the public URL to the plugin directory (trailing slash included).
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public static function pluginUrl(): string {
		return self::$pluginUrl ?? '';
	}

	/**
	 * Return the plugin basename, e.g. `all-feedback/all-feedback.php`.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public static function pluginBasename(): string {
		return self::$pluginBasename ?? '';
	}

	/**
	 * Return the current environment string (`'production'` or `'development'`).
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public static function environment(): string {
		return self::$environment;
	}

	/**
	 * Build an absolute filesystem path relative to the plugin root.
	 *
	 * @param  string $relativePath Relative path, e.g. `'config/services.php'`.
	 * @return string
	 * @since  1.0.0
	 */
	public static function path( string $relativePath = '' ): string {
		return self::pluginPath() . ltrim( $relativePath, '/' );
	}

	/**
	 * Build a public URL relative to the plugin root.
	 *
	 * @param  string $relativePath Relative path, e.g. `'resources/build/admin.js'`.
	 * @return string
	 * @since  1.0.0
	 */
	public static function url( string $relativePath = '' ): string {
		return self::pluginUrl() . ltrim( $relativePath, '/' );
	}

	/**
	 * Return true when the server's PHP version satisfies `MIN_PHP_VERSION`.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public static function meetsPHPRequirement(): bool {
		return version_compare( PHP_VERSION, self::MIN_PHP_VERSION, '>=' );
	}

	/**
	 * Return true when the installed WordPress satisfies `MIN_WP_VERSION`.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public static function meetsWPRequirement(): bool {
		global $wp_version;
		return version_compare( $wp_version, self::MIN_WP_VERSION, '>=' );
	}
}
