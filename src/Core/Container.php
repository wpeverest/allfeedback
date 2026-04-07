<?php

declare(strict_types=1);

namespace AllFeedback\Core;

use DI\ContainerBuilder;
use Psr\Container\ContainerInterface;

/**
 * Class Container
 *
 * Wraps the PHP-DI container with a small API used throughout the plugin.
 * Enables compiled container in production for a performance boost.
 */
class Container {

	private ContainerInterface $container;

	/** Whether the container was compiled to disk. */
	private bool $compiled = false;

	public function __construct() {
		$this->buildContainer();
	}

	// ------------------------------------------------------------------
	// Build
	// ------------------------------------------------------------------

	private function buildContainer(): void {
		$builder = new ContainerBuilder();

		// Enable auto-wiring so classes without explicit definitions are still resolved.
		$builder->useAutowiring( true );
		$builder->useAttributes( true );

		// In production, compile the container to a PHP file for speed.
		if ( $this->isProduction() ) {
			$cacheDir = WP_CONTENT_DIR . '/cache/all-feedback';
			$builder->enableCompilation( $cacheDir );
			$builder->writeProxiesToFile( true, $cacheDir . '/proxies' );
			$this->compiled = true;
		}

		// Load definitions from config/services.php.
		$this->loadServiceDefinitions( $builder );

		// Build the container and inject self-references so providers can
		// ask for the container by class name.
		$this->container = $builder->build();
		$this->container->set( self::class, $this );
	}

	/**
	 * Load the DI definitions file (config/services.php).
	 */
	private function loadServiceDefinitions( ContainerBuilder $builder ): void {
		$servicesFile = Constants::path( 'config/services.php' );

		if ( file_exists( $servicesFile ) ) {
			$definitions = require $servicesFile;
			$builder->addDefinitions( $definitions );
		}
	}

	// ------------------------------------------------------------------
	// PSR-11 proxy + extras
	// ------------------------------------------------------------------

	/**
	 * Resolve an entry from the container.
	 *
	 * @template T
	 * @param class-string<T>|string $id
	 * @return T|mixed
	 */
	public function get( string $id ): mixed {
		return $this->container->get( $id );
	}

	/** Check if an entry exists in the container. */
	public function has( string $id ): bool {
		return $this->container->has( $id );
	}

	/**
	 * Resolve an entry while injecting extra parameters.
	 *
	 * @param class-string|string $id
	 * @param array<string, mixed> $parameters
	 */
	public function make( string $id, array $parameters = [] ): mixed {
		return $this->container->make( $id, $parameters );
	}

	/**
	 * Override or add an entry in the container (useful for testing).
	 *
	 * @param string $id    Entry name.
	 * @param mixed  $value The value to set.
	 */
	public function set( string $id, mixed $value ): void {
		$this->container->set( $id, $value );
	}

	/** Returns the underlying PSR-11 container. */
	public function getContainer(): ContainerInterface {
		return $this->container;
	}

	// ------------------------------------------------------------------
	// Environment helpers
	// ------------------------------------------------------------------

	/**
	 * Production = no RMB_ENV constant, or RMB_ENV !== 'development'.
	 */
	private function isProduction(): bool {
		return ! defined( 'RMB_ENV' ) || 'development' !== constant( 'RMB_ENV' );
	}

	/** Whether the container was compiled to disk on this request. */
	public function isCompiled(): bool {
		return $this->compiled;
	}
}
