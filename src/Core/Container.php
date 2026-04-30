<?php

declare(strict_types=1);

namespace AllFeedback\Core;

defined( 'ABSPATH' ) || exit;

use DI\ContainerBuilder;
use Psr\Container\ContainerInterface;

/**
 * Wraps the PHP-DI container with a small API used throughout the plugin.
 *
 * Enables a compiled container in production for a performance boost. The
 * compiled class is cached under `wp-content/cache/allfeedback/{version}/`
 * so a version bump automatically invalidates a stale compiled container.
 *
 * @package AllFeedback\Core
 * @since   1.0.0
 */
class Container {

	/**
	 * The underlying PSR-11 container instance.
	 *
	 * @var ContainerInterface
	 * @since 1.0.0
	 */
	private ContainerInterface $container;

	/**
	 * Whether the container was compiled to disk on this request.
	 *
	 * @var bool
	 * @since 1.0.0
	 */
	private bool $compiled = false;

	/**
	 * Build and configure the DI container.
	 *
	 * @since  1.0.0
	 */
	public function __construct() {
		$this->buildContainer();
	}

	/**
	 * Construct the PHP-DI ContainerBuilder, enable optional compilation,
	 * load service definitions, and finalise the container.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function buildContainer(): void {
		$builder = new ContainerBuilder();

		$builder->useAutowiring( true );
		$builder->useAttributes( true );

		if ( $this->isProduction() ) {
			$cacheDir = WP_CONTENT_DIR . '/cache/allfeedback/' . Constants::VERSION;
			$builder->enableCompilation( $cacheDir );
			$builder->writeProxiesToFile( true, $cacheDir . '/proxies' );
			$this->compiled = true;
		}

		$this->loadServiceDefinitions( $builder );

		$this->container = $builder->build();
		$this->container->set( self::class, $this );
	}

	/**
	 * Require and register the DI definitions file (`config/services.php`).
	 *
	 * @param  ContainerBuilder $builder PHP-DI builder instance.
	 * @return void
	 * @since  1.0.0
	 */
	private function loadServiceDefinitions( ContainerBuilder $builder ): void {
		$servicesFile = Constants::path( 'config/services.php' );

		if ( file_exists( $servicesFile ) ) {
			$definitions = require $servicesFile;
			$builder->addDefinitions( $definitions );
		}
	}

	/**
	 * Resolve an entry from the container.
	 *
	 * @template T
	 * @param  class-string<T>|string $id Entry identifier.
	 * @return T|mixed                    Resolved value.
	 * @since  1.0.0
	 */
	public function get( string $id ): mixed {
		return $this->container->get( $id );
	}

	/**
	 * Check whether an entry exists in the container.
	 *
	 * @param  string $id Entry identifier.
	 * @return bool
	 * @since  1.0.0
	 */
	public function has( string $id ): bool {
		return $this->container->has( $id );
	}

	/**
	 * Resolve an entry while injecting extra parameters.
	 *
	 * @param  class-string|string  $id         Entry identifier.
	 * @param  array<string, mixed> $parameters Named parameters to inject.
	 * @return mixed
	 * @since  1.0.0
	 */
	public function make( string $id, array $parameters = [] ): mixed {
		return $this->container->make( $id, $parameters );
	}

	/**
	 * Override or add an entry in the container.
	 *
	 * @param  string $id    Entry name.
	 * @param  mixed  $value The value to bind.
	 * @return void
	 * @since  1.0.0
	 */
	public function set( string $id, mixed $value ): void {
		$this->container->set( $id, $value );
	}

	/**
	 * Return the underlying PSR-11 container instance.
	 *
	 * @return ContainerInterface
	 * @since  1.0.0
	 */
	public function getContainer(): ContainerInterface {
		return $this->container;
	}

	/**
	 * Determine whether the current environment is production.
	 *
	 * Production is assumed unless the plugin-specific environment constant is
	 * explicitly set to `development` in `wp-config.php`.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	private function isProduction(): bool {
		return Constants::isProduction();
	}

	/**
	 * Return whether the container was compiled to disk on this request.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isCompiled(): bool {
		return $this->compiled;
	}

	/**
	 * Delete the entire compiled-container cache directory.
	 *
	 * Safe to call on activation and after plugin upgrades so a stale compiled
	 * container is never loaded when DI bindings change between releases.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public static function purgeCache(): void {
		$dir = WP_CONTENT_DIR . '/cache/allfeedback/';

		if ( ! is_dir( $dir ) ) {
			return;
		}

		$iterator = new \RecursiveIteratorIterator(
			new \RecursiveDirectoryIterator( $dir, \RecursiveDirectoryIterator::SKIP_DOTS ),
			\RecursiveIteratorIterator::CHILD_FIRST
		);

		foreach ( $iterator as $file ) {
			if ( $file->isDir() ) {
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rmdir
				@rmdir( $file->getPathname() );
			} else {
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_unlink
				if ( ! @unlink( $file->getPathname() ) ) {
					error_log( 'AllFeedback: failed to delete cache file: ' . $file->getPathname() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				}
			}
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_rmdir
		@rmdir( $dir );
	}
}
