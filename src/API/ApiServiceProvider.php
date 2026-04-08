<?php

declare(strict_types=1);

namespace AllFeedback\API;

use AllFeedback\API\Controllers\V1\ResponsesController;
use AllFeedback\API\Controllers\V1\SurveysController;
use AllFeedback\Core\Container;
use AllFeedback\Core\ServiceProvider;
use AllFeedback\Traits\Hooks;
use DI\ContainerBuilder;

/**
 * Class ApiServiceProvider
 *
 * Boots the REST API layer.
 * Registers all V1 controllers on the 'rest_api_init' action.
 *
 * How to add a new REST controller:
 *  1. Create the controller in src/API/Controllers/V1/YourController.php.
 *  2. Add it to the $controllers array in registerRoutes().
 *  3. Add it to config/services.php so the DI container can resolve it.
 *
 * @since 1.0.0
 */
class ApiServiceProvider implements ServiceProvider {

	use Hooks;

	/**
	 * @param Container $container DI container used to resolve controller instances.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly Container $container,
	) {}

	/**
	 * ServiceProvider::register() — no additional DI definitions required here.
	 *
	 * @param ContainerBuilder $builder PHP-DI builder instance.
	 * @since 1.0.0
	 */
	public function register( ContainerBuilder $builder ): void {}

	/**
	 * Wire up the REST route registration hook.
	 *
	 * @since 1.0.0
	 */
	public function boot(): void {
		$this->addAction( 'rest_api_init', [ $this, 'registerRoutes' ] );
	}

	/**
	 * Resolve each controller from the DI container and call registerRoutes().
	 *
	 * The order of $controllers determines the order routes are registered,
	 * which matters when two URL patterns overlap (more-specific first).
	 *
	 * @since 1.0.0
	 */
	public function registerRoutes(): void {
		$controllers = [
			SurveysController::class,
			ResponsesController::class,
		];

		foreach ( $controllers as $class ) {
			if ( $this->container->has( $class ) ) {
				$this->container->get( $class )->registerRoutes();
			}
		}
	}
}
