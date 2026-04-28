<?php

declare(strict_types=1);

namespace AllFeedback\Modules;

defined( 'ABSPATH' ) || exit;

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
 *   add_filter( 'allfeedback:modules:register', function ( array $modules ) {
 *       $modules['my-module'] = \MyPlugin\MyModule::class;
 *       return $modules;
 *   } );
 *
 * The loader handles dependency resolution — if MyModule declares
 * dependencies = ['other-module'], that module is booted first.
 *
 * @package AllFeedback\Modules
 * @since   1.0.0
 */
class ModuleLoader {

	use Hooks;

	/**
	 * Singleton registry — written to during load, read by modules.
	 *
	 * @var ModuleRegistry
	 * @since 1.0.0
	 */
	private ModuleRegistry $registry;

	/**
	 * Map of module-id → FQCN.
	 * Populated via the 'allfeedback:modules:register' filter.
	 *
	 * @var array<string, class-string<ModuleInterface>>
	 * @since 1.0.0
	 */
	private array $availableModules = [];

	/**
	 * @param  Container $container DI container for instantiating module classes.
	 * @param  Logger    $logger    Logger for recording instantiation and boot errors.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Container $container,
		private readonly Logger $logger,
	) {
		$this->registry = ModuleRegistry::getInstance();
	}

	/**
	 * Run the full module lifecycle:
	 *   1. Allow third-party code to register module classes.
	 *   2. Instantiate modules.
	 *   3. Sort by dependency graph.
	 *   4. Call register() on each.
	 *   5. Call boot() on each enabled module.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function loadModules(): void {
		$this->availableModules = $this->applyFilters(
			'allfeedback:modules:register',
			$this->availableModules
		);

		$modules = $this->discoverModules();
		$sorted  = $this->sortByDependencies( $modules );

		foreach ( $sorted as $module ) {
			$this->registerModule( $module );
		}

		foreach ( $sorted as $module ) {
			$this->bootModule( $module );
		}

		$this->doAction( 'allfeedback:modules:loaded', $sorted );
	}

	/**
	 * Access the registry to inspect module state.
	 *
	 * @return ModuleRegistry
	 * @since  1.0.0
	 */
	public function getRegistry(): ModuleRegistry {
		return $this->registry;
	}

	/**
	 * Instantiate each registered module class.
	 *
	 * @return ModuleInterface[]
	 * @since  1.0.0
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

	/**
	 * Return modules sorted so each module comes after its dependencies.
	 *
	 * @param  ModuleInterface[] $modules Unsorted module list.
	 * @return ModuleInterface[]
	 * @since  1.0.0
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
	 * @param  ModuleInterface         $module  Module being visited.
	 * @param  ModuleInterface[]       $all     All discovered modules.
	 * @param  ModuleInterface[]       $sorted  Accumulator (by reference).
	 * @param  array<string, bool>     $visited Visited map (by reference).
	 * @return void
	 * @since  1.0.0
	 */
	private function visit(
		ModuleInterface $module,
		array $all,
		array &$sorted,
		array &$visited
	): void {
		$id = $module->getId();

		if ( isset( $visited[ $id ] ) ) {
			return;
		}

		$visited[ $id ] = true;

		foreach ( $module->getDependencies() as $depId ) {
			foreach ( $all as $candidate ) {
				if ( $candidate->getId() === $depId ) {
					$this->visit( $candidate, $all, $sorted, $visited );
				}
			}
		}

		$sorted[] = $module;
	}

	/**
	 * Register a single module in the registry and invoke its register() method.
	 *
	 * @param  ModuleInterface $module Module to register.
	 * @return void
	 * @since  1.0.0
	 */
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

	/**
	 * Boot a single module if it is enabled and has not already been booted.
	 *
	 * @param  ModuleInterface $module Module to boot.
	 * @return void
	 * @since  1.0.0
	 */
	private function bootModule( ModuleInterface $module ): void {
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
