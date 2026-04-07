<?php

declare(strict_types=1);

namespace AllFeedback\Modules;

use AllFeedback\Core\Container;
use AllFeedback\Support\Logger;
use AllFeedback\Traits\Hooks;

/**
 * Class ModuleLoader
 *
 * Discovers, dependency-sorts, registers, and boots all plugin modules.
 *
 * How to register a module from an add-on plugin:
 *
 *   add_filter( 'rmb:modules:register', function ( array $modules ) {
 *       $modules['my-module'] = \MyPlugin\MyModule::class;
 *       return $modules;
 *   } );
 *
 * The loader handles dependency resolution — if MyModule declares
 * dependencies = ['other-module'], that module is booted first.
 */
class ModuleLoader {

	use Hooks;

	/** Singleton registry — written to during load, read by modules. */
	private ModuleRegistry $registry;

	/**
	 * Map of module-id → FQCN.
	 * Populated via the 'rmb:modules:register' filter.
	 *
	 * @var array<string, class-string<ModuleInterface>>
	 */
	private array $availableModules = [];

	public function __construct(
		private readonly Container $container,
		private readonly Logger $logger,
	) {
		$this->registry = ModuleRegistry::getInstance();
	}

	// ------------------------------------------------------------------
	// Public API
	// ------------------------------------------------------------------

	/**
	 * Run the full module lifecycle:
	 *   1. Allow third-party code to register module classes.
	 *   2. Instantiate modules.
	 *   3. Sort by dependency graph.
	 *   4. Call register() on each.
	 *   5. Call boot()     on each enabled module.
	 */
	public function loadModules(): void {
		/**
		 * Filter: rmb:modules:register
		 *
		 * Add your module FQCN here. Keyed by module id.
		 *
		 * @param array<string, class-string<ModuleInterface>> $modules
		 */
		$this->availableModules = $this->applyFilters(
			'rmb:modules:register',
			$this->availableModules
		);

		$modules = $this->discoverModules();
		$sorted  = $this->sortByDependencies( $modules );

		// Register phase — all modules declared before any is booted.
		foreach ( $sorted as $module ) {
			$this->registerModule( $module );
		}

		// Boot phase — only enabled modules, in dependency order.
		foreach ( $sorted as $module ) {
			$this->bootModule( $module );
		}

		/**
		 * Action: rmb:modules:loaded
		 *
		 * Fires after all modules have been registered and booted.
		 *
		 * @param ModuleInterface[] $sorted Sorted module list.
		 */
		$this->doAction( 'rmb:modules:loaded', $sorted );
	}

	/** Access the registry to inspect module state. */
	public function getRegistry(): ModuleRegistry {
		return $this->registry;
	}

	// ------------------------------------------------------------------
	// Internal — discover
	// ------------------------------------------------------------------

	/**
	 * Instantiate each registered module class.
	 *
	 * @return ModuleInterface[]
	 */
	private function discoverModules(): array {
		$modules = [];

		foreach ( $this->availableModules as $class ) {
			if ( ! class_exists( $class ) ) {
				$this->logger->warning( "Module class not found: {$class}" );
				continue;
			}

			try {
				$modules[] = new $class( $this->container );
			} catch ( \Exception $e ) {
				$this->logger->error(
					"Failed to instantiate module: {$class}",
					[ 'error' => $e->getMessage() ]
				);
			}
		}

		return $modules;
	}

	// ------------------------------------------------------------------
	// Internal — dependency sort (topological)
	// ------------------------------------------------------------------

	/**
	 * Return modules sorted so each module comes after its dependencies.
	 *
	 * @param ModuleInterface[] $modules
	 * @return ModuleInterface[]
	 */
	private function sortByDependencies( array $modules ): array {
		$sorted  = [];
		$visited = [];

		foreach ( $modules as $module ) {
			$this->visit( $module, $modules, $sorted, $visited );
		}

		return $sorted;
	}

	/**
	 * Recursive DFS visit for topological sort.
	 *
	 * @param ModuleInterface   $module
	 * @param ModuleInterface[] $all
	 * @param ModuleInterface[] $sorted  (by reference)
	 * @param array<string,bool> $visited (by reference)
	 */
	private function visit(
		ModuleInterface $module,
		array $all,
		array &$sorted,
		array &$visited
	): void {
		$id = $module->getId();

		if ( isset( $visited[ $id ] ) ) {
			return; // Already processed.
		}

		$visited[ $id ] = true;

		// Process dependencies first.
		foreach ( $module->getDependencies() as $depId ) {
			foreach ( $all as $candidate ) {
				if ( $candidate->getId() === $depId ) {
					$this->visit( $candidate, $all, $sorted, $visited );
				}
			}
		}

		$sorted[] = $module;
	}

	// ------------------------------------------------------------------
	// Internal — register & boot
	// ------------------------------------------------------------------

	private function registerModule( ModuleInterface $module ): void {
		try {
			$this->registry->register( $module );
			$module->register();
		} catch ( \Exception $e ) {
			$this->logger->error(
				"Failed to register module: {$module->getId()}",
				[ 'error' => $e->getMessage() ]
			);
		}
	}

	private function bootModule( ModuleInterface $module ): void {
		// Skip disabled or already-booted modules.
		if ( ! $module->isEnabled() || $this->registry->isBooted( $module->getId() ) ) {
			return;
		}

		try {
			$module->boot();
			$this->registry->markAsBooted( $module->getId() );
		} catch ( \Exception $e ) {
			$this->logger->error(
				"Failed to boot module: {$module->getId()}",
				[ 'error' => $e->getMessage() ]
			);
		}
	}
}
