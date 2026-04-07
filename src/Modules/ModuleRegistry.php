<?php

declare(strict_types=1);

namespace AllFeedback\Modules;

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
 */
class ModuleRegistry {

	use Singleton;

	/** @var array<string, ModuleInterface> Map of module-id → module instance. */
	private array $modules = [];

	/** @var array<string, bool> Tracks which modules have been booted. */
	private array $booted = [];

	// ------------------------------------------------------------------
	// Registration
	// ------------------------------------------------------------------

	/**
	 * Register a module. Silently skips duplicate IDs.
	 */
	public function register( ModuleInterface $module ): void {
		$id = $module->getId();

		if ( isset( $this->modules[ $id ] ) ) {
			return; // Already registered — idempotent.
		}

		$this->modules[ $id ] = $module;
		$this->booted[ $id ]  = false;
	}

	// ------------------------------------------------------------------
	// Queries
	// ------------------------------------------------------------------

	public function getModule( string $id ): ?ModuleInterface {
		return $this->modules[ $id ] ?? null;
	}

	/** @return array<string, ModuleInterface> */
	public function getAllModules(): array {
		return $this->modules;
	}

	/** @return array<string, ModuleInterface> */
	public function getEnabledModules(): array {
		return array_filter(
			$this->modules,
			fn( ModuleInterface $m ) => $m->isEnabled()
		);
	}

	public function hasModule( string $id ): bool {
		return isset( $this->modules[ $id ] );
	}

	public function count(): int {
		return count( $this->modules );
	}

	// ------------------------------------------------------------------
	// Boot tracking
	// ------------------------------------------------------------------

	public function isBooted( string $id ): bool {
		return $this->booted[ $id ] ?? false;
	}

	public function markAsBooted( string $id ): void {
		$this->booted[ $id ] = true;
	}

	// ------------------------------------------------------------------
	// Enable / Disable helpers
	// ------------------------------------------------------------------

	public function enableModule( string $id ): bool {
		$module = $this->getModule( $id );
		if ( ! $module ) {
			return false;
		}
		$module->enable();
		return true;
	}

	public function disableModule( string $id ): bool {
		$module = $this->getModule( $id );
		if ( ! $module ) {
			return false;
		}
		$module->disable();
		return true;
	}
}
