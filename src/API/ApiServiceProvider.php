<?php

declare(strict_types=1);

namespace AllFeedback\API;

use AllFeedback\API\Controllers\V1\AnalyticsController;
use AllFeedback\API\Controllers\V1\ContentSearchController;
use AllFeedback\API\Controllers\V1\LogsController;
use AllFeedback\API\Controllers\V1\ResponsesController;
use AllFeedback\API\Controllers\V1\SettingsController;
use AllFeedback\API\Controllers\V1\SubmitController;
use AllFeedback\API\Controllers\V1\SurveyStateController;
use AllFeedback\API\Controllers\V1\SurveysController;
use AllFeedback\API\Controllers\V1\DashboardController;
use AllFeedback\API\Controllers\V1\WizardController;
use AllFeedback\Core\Container;
use AllFeedback\Core\ServiceProvider;
use AllFeedback\Traits\Hooks;
use DI\ContainerBuilder;

/**
 * Boots the REST API layer by registering all V1 controllers on `rest_api_init`.
 *
 * To add a new REST controller:
 *  1. Create the controller in `src/API/Controllers/V1/YourController.php`.
 *  2. Add it to the `$controllers` array in `registerRoutes()`.
 *  3. Bind it in `config/services.php` so the DI container can resolve it.
 *
 * @package AllFeedback\API
 * @since   1.0.0
 */
class ApiServiceProvider implements ServiceProvider {

	use Hooks;

	/**
	 * @param  Container $container DI container used to resolve controller instances.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Container $container,
	) {}

	/**
	 * {@inheritDoc}
	 *
	 * @param  ContainerBuilder $builder PHP-DI builder instance.
	 * @return void
	 * @since  1.0.0
	 */
	public function register( ContainerBuilder $builder ): void {}

	/**
	 * Wire up the REST route registration hook.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function boot(): void {
		$this->addAction( 'rest_api_init', [ $this, 'registerRoutes' ] );
	}

	/**
	 * Resolve each controller from the DI container and call `registerRoutes()`.
	 *
	 * Order matters when two URL patterns overlap — list more-specific
	 * (nested) routes before their parent resource.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerRoutes(): void {
		$controllers = [
			SubmitController::class,        // /surveys/{id}/submit            — public, nonce-gated
			AnalyticsController::class,     // /surveys/{id}/analytics[/event] — public POST, admin GET
			SurveyStateController::class,   // /surveys/{id}/state             — logged-in users only
			ResponsesController::class,     // /surveys/{id}/responses         — admin, must come before SurveysController
			SurveysController::class,       // /surveys
			SettingsController::class,      // /settings
			WizardController::class,        // /wizard
			ContentSearchController::class, // /content-search
			LogsController::class,          // /logs
			DashboardController::class,     // /dashboard/stats
		];

		foreach ( $controllers as $class ) {
			if ( $this->container->has( $class ) ) {
				$this->container->get( $class )->registerRoutes();
			}
		}
	}
}
