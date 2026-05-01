<?php
/**
 * Asset manager.
 *
 * @package AllFeedback\Support
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Support;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Constants;

/**
 * Class AssetManager
 *
 * Centralises script and style enqueueing for both admin and frontend.
 * All handles are automatically prefixed with 'allfb-' to avoid collisions
 * with other plugins.
 *
 * Build assets are expected in resources/build/ (output of your JS bundler).
 * Each JS entry point should ship a companion *.asset.php file that lists
 * its dependencies and a content hash:
 *
 *   return [
 *       'dependencies' => [ 'wp-element', 'wp-i18n' ],
 *       'version'      => 'abc123',
 *   ];
 *
 * If the asset file is missing (e.g. before the first build), the manager
 * logs a warning and falls back to sane defaults so the site doesn't crash.
 *
 * @package AllFeedback\Support
 * @since   1.0.0
 */
class AssetManager {

	/**
	 * All handles registered by this manager are prefixed with this string.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const HANDLE_PREFIX = 'allfb-';

	/**
	 * Local dev server URL — used only when the plugin is explicitly in
	 * development mode via `wp-config.php`.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const DEV_SERVER = 'http://localhost:5173/';

	/**
	 * Absolute path to the build directory.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private string $build_path;

	/**
	 * Public URL to the build directory.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private string $build_url;

	/**
	 * Simple in-memory cache to avoid reading asset files more than once.
	 *
	 * @var array<string, array{dependencies: string[], version: string}>
	 * @since 1.0.0
	 */
	private array $asset_cache = [];

	/**
	 * True when running against a Vite/webpack dev-server.
	 *
	 * @var bool
	 * @since 1.0.0
	 */
	private bool $is_dev_server;

	/**
	 * Constructor.
	 *
	 * @param  Logger $logger Logger for missing-asset warnings.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Logger $logger,
	) {
		$this->is_dev_server = Constants::isDevelopment();
		$this->build_path    = Constants::path( 'resources/build/' );
		$this->build_url     = $this->is_dev_server ? self::DEV_SERVER : Constants::url( 'resources/build/' );
	}

	/**
	 * Enqueue a JS file from the build directory.
	 *
	 * @param  string               $handle   Short handle (without prefix).
	 * @param  string               $src      File name relative to resources/build/, e.g. 'admin.js'.
	 * @param  string[]             $deps     Extra WordPress script handles to depend on.
	 * @param  bool                 $in_footer Load in footer.
	 * @param  array<string, mixed> $localize Optional inline-script data.
	 *                                        Format: [ 'object_name' => '__ALLFB_ADMIN__', 'data' => [...] ].
	 * @return void
	 * @since  1.0.0
	 */
	public function enqueueScript(
		string $handle,
		string $src,
		array $deps = [],
		bool $in_footer = true,
		array $localize = []
	): void {
		$full_handle = self::HANDLE_PREFIX . $handle;

		if ( wp_script_is( $full_handle, 'registered' ) ) {
			wp_enqueue_script( $full_handle );
		} else {
			$asset = $this->loadAssetFile( $src );

			wp_enqueue_script(
				$full_handle,
				$this->scriptUrl( $src ),
				array_unique( array_merge( $asset['dependencies'], $deps ) ),
				$asset['version'],
				$in_footer
			);
		}

		if ( ! empty( $localize ) ) {
			$this->localizeScript( $handle, $localize );
		}
	}

	/**
	 * Inject a JS variable before the enqueued script.
	 *
	 * @param  string               $handle  Short handle (without prefix).
	 * @param  array<string, mixed> $localize Format: [ 'object_name' => 'VAR', 'data' => [...] ].
	 * @return void
	 * @since  1.0.0
	 */
	public function localizeScript( string $handle, array $localize ): void {
		$full_handle = self::HANDLE_PREFIX . $handle;
		$object_name = $localize['object_name'] ?? '__ALLFEEDBACK__';
		$data        = $localize['data'] ?? [];

		if ( ! preg_match( '/^[a-zA-Z_$][a-zA-Z0-9_$]*$/', $object_name ) ) {
			$object_name = '__ALLFEEDBACK__';
		}

		wp_localize_script( $full_handle, $object_name, $data );
	}

	/**
	 * Enqueue a CSS file from the build directory.
	 *
	 * @param  string   $handle Short handle (without prefix).
	 * @param  string   $src    File name relative to resources/build/, e.g. 'admin.css'.
	 * @param  string[] $deps   Extra style handles to depend on.
	 * @param  string   $media  CSS media attribute.
	 * @return void
	 * @since  1.0.0
	 */
	public function enqueueStyle(
		string $handle,
		string $src,
		array $deps = [],
		string $media = 'all'
	): void {
		$full_handle = self::HANDLE_PREFIX . $handle;

		if ( wp_style_is( $full_handle, 'registered' ) ) {
			wp_enqueue_style( $full_handle );
			return;
		}

		wp_enqueue_style(
			$full_handle,
			$this->styleUrl( $src ),
			$deps,
			$this->versionForCss( $src ),
			$media
		);
	}

	/**
	 * Full public URL to a JS file in resources/build/.
	 *
	 * @param  string $src JS file name relative to the build directory.
	 * @return string
	 * @since  1.0.0
	 */
	public function scriptUrl( string $src ): string {
		return rtrim( $this->build_url, '/' ) . '/' . ltrim( $src, '/' );
	}

	/**
	 * Full public URL to a CSS file in resources/build/.
	 *
	 * @param  string $src CSS file name relative to the build directory.
	 * @return string
	 * @since  1.0.0
	 */
	public function styleUrl( string $src ): string {
		return rtrim( $this->build_url, '/' ) . '/' . ltrim( $src, '/' );
	}

	/**
	 * Load the .asset.php companion file generated by the bundler.
	 *
	 * @param  string $src JS file name, e.g. 'admin.js'.
	 * @return array{dependencies: string[], version: string}
	 * @since  1.0.0
	 */
	public function loadAssetFile( string $src ): array {
		$stem      = pathinfo( ltrim( $src, '/' ), PATHINFO_FILENAME );
		$cache_key = $stem;

		if ( isset( $this->asset_cache[ $cache_key ] ) ) {
			return $this->asset_cache[ $cache_key ];
		}

		$asset_file = $this->build_path . $stem . '.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			$this->logger->warning(
				"AssetManager: '{$stem}.asset.php' not found. Run your bundler (e.g. npm run build)."
			);
			$this->asset_cache[ $cache_key ] = $this->fallbackAsset();
			return $this->asset_cache[ $cache_key ];
		}

		$asset = require $asset_file;

		if ( ! is_array( $asset ) || ! array_key_exists( 'dependencies', $asset ) || ! array_key_exists( 'version', $asset ) ) {
			$this->logger->warning(
				"AssetManager: '{$stem}.asset.php' has an unexpected format."
			);
			$this->asset_cache[ $cache_key ] = $this->fallbackAsset();
			return $this->asset_cache[ $cache_key ];
		}

		$this->asset_cache[ $cache_key ] = [
			'dependencies' => (array) $asset['dependencies'],
			'version'      => (string) $asset['version'],
		];
		return $this->asset_cache[ $cache_key ];
	}

	/**
	 * Derive a cache-busting version for a CSS file.
	 *
	 * Prefers the hash from the companion .asset.php; falls back to mtime
	 * of the CSS file itself, and finally to the plugin version constant.
	 *
	 * @param  string $css_src CSS file name relative to the build directory.
	 * @return string
	 * @since  1.0.0
	 */
	private function versionForCss( string $css_src ): string {
		$stem       = pathinfo( ltrim( $css_src, '/' ), PATHINFO_FILENAME );
		$asset_file = $this->build_path . $stem . '.asset.php';

		if ( file_exists( $asset_file ) ) {
			$asset = $this->loadAssetFile( $stem . '.js' );
			if ( $asset['version'] !== Constants::VERSION ) {
				return $asset['version'];
			}
		}

		$css_file = $this->build_path . ltrim( $css_src, '/' );
		if ( file_exists( $css_file ) ) {
			return (string) filemtime( $css_file );
		}

		return Constants::VERSION;
	}

	/**
	 * Returns safe defaults when the .asset.php file is missing or invalid.
	 *
	 * @return array{dependencies: string[], version: string}
	 * @since  1.0.0
	 */
	private function fallbackAsset(): array {
		return [
			'dependencies' => [],
			'version'      => Constants::VERSION,
		];
	}
}
