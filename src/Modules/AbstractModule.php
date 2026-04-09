<?php

declare(strict_types=1);

namespace AllFeedback\Modules;

use AllFeedback\Core\Container;
use AllFeedback\Traits\Hooks;

/**
 * Abstract class AbstractModule
 *
 * Provides default behaviour for all modules:
 *  - enable/disable with WP-options persistence
 *  - dependency checking via ModuleRegistry
 *  - helper container accessors
 *
 * Extend this class for every module you add:
 *
 *   class SampleModule extends AbstractModule {
 *       protected string $id          = 'sample-module';
 *       protected string $name        = 'Sample Module';
 *       protected string $description = 'A sample add-on module.';
 *
 *       public function boot(): void {
 *           parent::boot(); // respect isEnabled() guard
 *           $this->addAction( 'init', [ $this, 'doSomething' ] );
 *       }
 *   }
 *
 * Register it by hooking into 'allfeedback:modules:register':
 *
 *   add_filter( 'allfeedback:modules:register', function ( $modules ) {
 *       $modules['sample-module'] = SampleModule::class;
 *       return $modules;
 *   } );
 */
abstract class AbstractModule implements ModuleInterface {

	use Hooks;

	/** @var Container DI container — use $this->get( SomeService::class ) to resolve. */
	protected Container $container;

	/** Whether this module is currently enabled (loaded from WP options). */
	protected bool $enabled = false;

	/** Unique module slug — override in child class. */
	protected string $id = '';

	/** Human-readable name — override in child class. */
	protected string $name = '';

	/** Short description — override in child class. */
	protected string $description = '';

	/** Module version — override in child class if needed. */
	protected string $version = '1.0.0';

	/**
	 * IDs of modules this module depends on.
	 * The loader will boot those modules first.
	 *
	 * @var string[]
	 */
	protected array $dependencies = [];

	public function __construct( Container $container ) {
		$this->container = $container;
		$this->loadModuleState();
	}

	// ------------------------------------------------------------------
	// Default implementations (override in child classes as needed)
	// ------------------------------------------------------------------

	/** {@inheritdoc} */
	public function register(): void {
		// Override to register services / listeners.
	}

	/** {@inheritdoc} */
	public function boot(): void {
		// Guard — do nothing if disabled or dependencies not met.
		if ( ! $this->isEnabled() ) {
			return;
		}
		// Override with your module logic.
	}

	// ------------------------------------------------------------------
	// State
	// ------------------------------------------------------------------

	/** {@inheritdoc} */
	public function isEnabled(): bool {
		return $this->enabled && $this->checkDependencies();
	}

	/** {@inheritdoc} */
	public function getId(): string { return $this->id; }

	/** {@inheritdoc} */
	public function getName(): string { return $this->name; }

	/** {@inheritdoc} */
	public function getDescription(): string { return $this->description; }

	/** {@inheritdoc} */
	public function getVersion(): string { return $this->version; }

	/** {@inheritdoc} */
	public function getDependencies(): array { return $this->dependencies; }

	// ------------------------------------------------------------------
	// Enable / Disable
	// ------------------------------------------------------------------

	/** {@inheritdoc} */
	public function enable(): void {
		$this->enabled = true;
		$this->saveModuleState();
		$this->doAction( "allfeedback:module:{$this->id}:enabled" );
	}

	/** {@inheritdoc} */
	public function disable(): void {
		$this->enabled = false;
		$this->saveModuleState();
		$this->doAction( "allfeedback:module:{$this->id}:disabled" );
	}

	// ------------------------------------------------------------------
	// Helpers
	// ------------------------------------------------------------------

	/**
	 * Resolve a service from the DI container.
	 *
	 * @template T
	 * @param class-string<T>|string $id
	 * @return T|mixed
	 */
	protected function get( string $id ): mixed {
		return $this->container->get( $id );
	}

	// ------------------------------------------------------------------
	// Internal
	// ------------------------------------------------------------------

	/**
	 * Check that all declared dependencies are registered and enabled.
	 */
	private function checkDependencies(): bool {
		$registry = ModuleRegistry::getInstance();

		foreach ( $this->dependencies as $dependencyId ) {
			$dep = $registry->getModule( $dependencyId );
			if ( ! $dep || ! $dep->isEnabled() ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Load the enabled/disabled state from wp_options.
	 */
	private function loadModuleState(): void {
		$enabledModules = (array) get_option( '_allfb_enabled_modules', [] );
		$this->enabled  = in_array( $this->id, $enabledModules, true );
	}

	/**
	 * Persist the current enabled/disabled state to wp_options.
	 */
	private function saveModuleState(): void {
		$enabledModules = (array) get_option( '_allfb_enabled_modules', [] );

		if ( $this->enabled ) {
			if ( ! in_array( $this->id, $enabledModules, true ) ) {
				$enabledModules[] = $this->id;
			}
		} else {
			$enabledModules = array_diff( $enabledModules, [ $this->id ] );
		}

		update_option( '_allfb_enabled_modules', array_values( $enabledModules ) );
	}
}
