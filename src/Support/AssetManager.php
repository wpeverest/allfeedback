<?php

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
	private string $buildPath;

	/**
	 * Public URL to the build directory.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private string $buildUrl;

	/**
	 * Simple in-memory cache to avoid reading asset files more than once.
	 *
	 * @var array<string, array{dependencies: string[], version: string}>
	 * @since 1.0.0
	 */
	private array $assetCache = [];

	/**
	 * True when running against a Vite/webpack dev-server.
	 *
	 * @var bool
	 * @since 1.0.0
	 */
	private bool $isDevServer;

	/**
	 * @param  Logger $logger Logger for missing-asset warnings.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Logger $logger,
	) {
		$this->isDevServer = Constants::isDevelopment();
		$this->buildPath   = Constants::path( 'resources/build/' );
		$this->buildUrl    = $this->isDevServer ? self::DEV_SERVER : Constants::url( 'resources/build/' );
	}

	/**
	 * Enqueue a JS file from the build directory.
	 *
	 * @param  string               $handle   Short handle (without prefix).
	 * @param  string               $src      File name relative to resources/build/, e.g. 'admin.js'.
	 * @param  string[]             $deps     Extra WordPress script handles to depend on.
	 * @param  bool                 $inFooter Load in footer?
	 * @param  array<string, mixed> $localize Optional inline-script data:
	 *                                        [ 'object_name' => '__ALLFB_ADMIN__', 'data' => [...] ]
	 * @return void
	 * @since  1.0.0
	 */
	public function enqueueScript(
		string $handle,
		string $src,
		array $deps = [],
		bool $inFooter = true,
		array $localize = []
	): void {
		$fullHandle = self::HANDLE_PREFIX . $handle;

		if ( wp_script_is( $fullHandle, 'registered' ) ) {
			wp_enqueue_script( $fullHandle );
		} else {
			$asset = $this->loadAssetFile( $src );

			wp_enqueue_script(
				$fullHandle,
				$this->scriptUrl( $src ),
				array_unique( array_merge( $asset['dependencies'], $deps ) ),
				$asset['version'],
				$inFooter
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
	 * @param  array<string, mixed> $localize [ 'object_name' => 'VAR', 'data' => [...] ]
	 * @return void
	 * @since  1.0.0
	 */
	public function localizeScript( string $handle, array $localize ): void {
		$fullHandle = self::HANDLE_PREFIX . $handle;
		$objectName = $localize['object_name'] ?? '__ALLFEEDBACK__';
		$data       = $localize['data']        ?? [];

		if ( ! preg_match( '/^[a-zA-Z_$][a-zA-Z0-9_$]*$/', $objectName ) ) {
			$objectName = '__ALLFEEDBACK__';
		}

		wp_localize_script( $fullHandle, $objectName, $data );
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
		$fullHandle = self::HANDLE_PREFIX . $handle;

		if ( wp_style_is( $fullHandle, 'registered' ) ) {
			wp_enqueue_style( $fullHandle );
			return;
		}

		wp_enqueue_style(
			$fullHandle,
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
		return rtrim( $this->buildUrl, '/' ) . '/' . ltrim( $src, '/' );
	}

	/**
	 * Full public URL to a CSS file in resources/build/.
	 *
	 * @param  string $src CSS file name relative to the build directory.
	 * @return string
	 * @since  1.0.0
	 */
	public function styleUrl( string $src ): string {
		return rtrim( $this->buildUrl, '/' ) . '/' . ltrim( $src, '/' );
	}

	/**
	 * Load the .asset.php companion file generated by the bundler.
	 *
	 * @param  string $src JS file name, e.g. 'admin.js'.
	 * @return array{dependencies: string[], version: string}
	 * @since  1.0.0
	 */
	public function loadAssetFile( string $src ): array {
		$stem     = pathinfo( ltrim( $src, '/' ), PATHINFO_FILENAME );
		$cacheKey = $stem;

		if ( isset( $this->assetCache[ $cacheKey ] ) ) {
			return $this->assetCache[ $cacheKey ];
		}

		$assetFile = $this->buildPath . $stem . '.asset.php';

		if ( ! file_exists( $assetFile ) ) {
			$this->logger->warning(
				"AssetManager: '{$stem}.asset.php' not found. Run your bundler (e.g. npm run build)."
			);
			return $this->assetCache[ $cacheKey ] = $this->fallbackAsset();
		}

		$asset = require $assetFile;

		if ( ! is_array( $asset ) || ! array_key_exists( 'dependencies', $asset ) || ! array_key_exists( 'version', $asset ) ) {
			$this->logger->warning(
				"AssetManager: '{$stem}.asset.php' has an unexpected format."
			);
			return $this->assetCache[ $cacheKey ] = $this->fallbackAsset();
		}

		return $this->assetCache[ $cacheKey ] = [
			'dependencies' => (array) $asset['dependencies'],
			'version'      => (string) $asset['version'],
		];
	}

	/**
	 * Derive a cache-busting version for a CSS file.
	 *
	 * Prefers the hash from the companion .asset.php; falls back to mtime
	 * of the CSS file itself, and finally to the plugin version constant.
	 *
	 * @param  string $cssSrc CSS file name relative to the build directory.
	 * @return string
	 * @since  1.0.0
	 */
	private function versionForCss( string $cssSrc ): string {
		$stem      = pathinfo( ltrim( $cssSrc, '/' ), PATHINFO_FILENAME );
		$assetFile = $this->buildPath . $stem . '.asset.php';

		if ( file_exists( $assetFile ) ) {
			$asset = $this->loadAssetFile( $stem . '.js' );
			if ( $asset['version'] !== Constants::VERSION ) {
				return $asset['version'];
			}
		}

		$cssFile = $this->buildPath . ltrim( $cssSrc, '/' );
		if ( file_exists( $cssFile ) ) {
			return (string) filemtime( $cssFile );
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
