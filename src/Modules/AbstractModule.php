<?php
/**
 * Abstract module.
 *
 * @package AllFeedback\Modules
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Modules;

defined( 'ABSPATH' ) || exit;

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
 *
 * @package AllFeedback\Modules
 * @since   1.0.0
 */
abstract class AbstractModule implements ModuleInterface {

	use Hooks;

	/**
	 * DI container — use $this->get( SomeService::class ) to resolve.
	 *
	 * @var Container
	 * @since 1.0.0
	 */
	protected Container $container;

	/**
	 * Whether this module is currently enabled (loaded from WP options).
	 *
	 * @var bool
	 * @since 1.0.0
	 */
	protected bool $enabled = false;

	/**
	 * Unique module slug — override in child class.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $id = '';

	/**
	 * Human-readable name — override in child class.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $name = '';

	/**
	 * Short description — override in child class.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $description = '';

	/**
	 * Module version — override in child class if needed.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $version = '1.0.0';

	/**
	 * IDs of modules this module depends on.
	 * The loader will boot those modules first.
	 *
	 * @var string[]
	 * @since 1.0.0
	 */
	protected array $dependencies = [];

	/**
	 * Constructor.
	 *
	 * @param  Container $container DI container for resolving services within the module.
	 * @since  1.0.0
	 */
	public function __construct( Container $container ) {
		$this->container = $container;
		$this->loadModuleState();
	}

	/**
	 * {@inheritdoc}
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function register(): void {}

	/**
	 * {@inheritdoc}
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function boot(): void {
		if ( ! $this->isEnabled() ) {
			return;
		}
	}

	/**
	 * {@inheritdoc}
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isEnabled(): bool {
		return $this->enabled && $this->checkDependencies();
	}

	/**
	 * {@inheritdoc}
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getId(): string {
		return $this->id; }

	/**
	 * {@inheritdoc}
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getName(): string {
		return $this->name; }

	/**
	 * {@inheritdoc}
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getDescription(): string {
		return $this->description; }

	/**
	 * {@inheritdoc}
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getVersion(): string {
		return $this->version; }

	/**
	 * {@inheritdoc}
	 *
	 * @return string[]
	 * @since  1.0.0
	 */
	public function getDependencies(): array {
		return $this->dependencies; }

	/**
	 * {@inheritdoc}
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function enable(): void {
		$this->enabled = true;
		$this->saveModuleState();
		$this->doAction( "allfeedback:module:{$this->id}:enabled" );
	}

	/**
	 * {@inheritdoc}
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function disable(): void {
		$this->enabled = false;
		$this->saveModuleState();
		$this->doAction( "allfeedback:module:{$this->id}:disabled" );
	}

	/**
	 * Resolve a service from the DI container.
	 *
	 * @template T
	 * @param  class-string<T>|string $id Service or class identifier.
	 * @return T|mixed
	 * @since  1.0.0
	 */
	protected function get( string $id ): mixed {
		return $this->container->get( $id );
	}

	/**
	 * Check that all declared dependencies are registered and enabled.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	private function checkDependencies(): bool {
		$registry = ModuleRegistry::getInstance();

		foreach ( $this->dependencies as $dependency_id ) {
			$dep = $registry->getModule( $dependency_id );
			if ( ! $dep || ! $dep->isEnabled() ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Load the enabled/disabled state from wp_options.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function loadModuleState(): void {
		$enabled_modules = (array) get_option( '_allfeedback_enabled_modules', [] );
		$this->enabled   = in_array( $this->id, $enabled_modules, true );
	}

	/**
	 * Persist the current enabled/disabled state to wp_options.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function saveModuleState(): void {
		$enabled_modules = (array) get_option( '_allfeedback_enabled_modules', [] );

		if ( $this->enabled ) {
			if ( ! in_array( $this->id, $enabled_modules, true ) ) {
				$enabled_modules[] = $this->id;
			}
		} else {
			$enabled_modules = array_diff( $enabled_modules, [ $this->id ] );
		}

		update_option( '_allfeedback_enabled_modules', array_values( $enabled_modules ) );
	}
}
