<?php

declare(strict_types=1);

namespace AllFeedback\Modules;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Traits\Singleton;

/**
 * Class ModuleRegistry
 *
 * Singleton store for all registered modules.
 * ModuleLoader writes to this; external code reads from it.
 *
 * Usage:
 *   $registry = ModuleRegistry::getInstance();
 *   $module   = $registry->getModule( 'sample-module' );
 *   $enabled  = $registry->getEnabledModules();
 *
 * @package AllFeedback\Modules
 * @since   1.0.0
 */
class ModuleRegistry {

	use Singleton;

	/**
	 * Map of module-id → module instance.
	 *
	 * @var array<string, ModuleInterface>
	 * @since 1.0.0
	 */
	private array $modules = [];

	/**
	 * Tracks which modules have been booted.
	 *
	 * @var array<string, bool>
	 * @since 1.0.0
	 */
	private array $booted = [];

	/**
	 * Register a module. Silently skips duplicate IDs.
	 *
	 * @param  ModuleInterface $module Module instance to register.
	 * @return void
	 * @since  1.0.0
	 */
	public function register( ModuleInterface $module ): void {
		$id = $module->getId();

		if ( isset( $this->modules[ $id ] ) ) {
			return;
		}

		$this->modules[ $id ] = $module;
		$this->booted[ $id ]  = false;
	}

	/**
	 * Return a module by its ID, or null if not registered.
	 *
	 * @param  string $id Module slug.
	 * @return ModuleInterface|null
	 * @since  1.0.0
	 */
	public function getModule( string $id ): ?ModuleInterface {
		return $this->modules[ $id ] ?? null;
	}

	/**
	 * Return all registered modules keyed by their ID.
	 *
	 * @return array<string, ModuleInterface>
	 * @since  1.0.0
	 */
	public function getAllModules(): array {
		return $this->modules;
	}

	/**
	 * Return only enabled modules keyed by their ID.
	 *
	 * @return array<string, ModuleInterface>
	 * @since  1.0.0
	 */
	public function getEnabledModules(): array {
		return array_filter(
			$this->modules,
			fn( ModuleInterface $m ) => $m->isEnabled()
		);
	}

	/**
	 * Return true when a module with the given ID has been registered.
	 *
	 * @param  string $id Module slug.
	 * @return bool
	 * @since  1.0.0
	 */
	public function hasModule( string $id ): bool {
		return isset( $this->modules[ $id ] );
	}

	/**
	 * Return the total number of registered modules.
	 *
	 * @return int
	 * @since  1.0.0
	 */
	public function count(): int {
		return count( $this->modules );
	}

	/**
	 * Return true when the given module has been booted.
	 *
	 * @param  string $id Module slug.
	 * @return bool
	 * @since  1.0.0
	 */
	public function isBooted( string $id ): bool {
		return $this->booted[ $id ] ?? false;
	}

	/**
	 * Mark a module as booted.
	 *
	 * @param  string $id Module slug.
	 * @return void
	 * @since  1.0.0
	 */
	public function markAsBooted( string $id ): void {
		$this->booted[ $id ] = true;
	}

	/**
	 * Enable a registered module and persist the state.
	 *
	 * @param  string $id Module slug.
	 * @return bool True when the module was found and enabled; false otherwise.
	 * @since  1.0.0
	 */
	public function enableModule( string $id ): bool {
		$module = $this->getModule( $id );
		if ( ! $module ) {
			return false;
		}
		$module->enable();
		return true;
	}

	/**
	 * Disable a registered module and persist the state.
	 *
	 * @param  string $id Module slug.
	 * @return bool True when the module was found and disabled; false otherwise.
	 * @since  1.0.0
	 */
	public function disableModule( string $id ): bool {
		$module = $this->getModule( $id );
		if ( ! $module ) {
			return false;
		}
		$module->disable();
		return true;
	}
}
