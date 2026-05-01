<?php
/**
 * Bootstrap controller.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Analytics\SurveySessionRepository;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\SurveyRepository;

/**
 * Bootstrap controller — returns everything the admin SPA needs in one request.
 *
 * Routes (under `allfeedback/v1`):
 *   `GET /bootstrap` — admin; returns settings + overview stats + forms summary
 *
 * Reduces 3-4 separate API calls (12-15 queries) to 1 request (7-8 queries).
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class BootstrapController extends RestController {

	/**
	 * REST resource slug.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $rest_base = 'bootstrap';

	/**
	 * Constructor.
	 *
	 * @param  SettingsManager         $settings_manager    Plugin settings.
	 * @param  SurveyRepository        $survey_repository   Survey data access.
	 * @param  SurveySessionRepository $session_repository  Session analytics data access.
	 * @param  ResponseRepository      $response_repository Response data access.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SettingsManager $settings_manager,
		private readonly SurveyRepository $survey_repository,
		private readonly SurveySessionRepository $session_repository,
		private readonly ResponseRepository $response_repository,
	) {}

	/**
	 * Register REST routes.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'getBootstrap' ],
				'permission_callback' => [ $this, 'adminPermission' ],
			]
		);
	}

	/**
	 * Handle `GET /bootstrap`.
	 *
	 * Returns settings + overview stats in one response.
	 * Frontend can call this once on app mount instead of 3-4 separate endpoints.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response
	 * @since  1.0.0
	 */
	public function getBootstrap( \WP_REST_Request $request ): \WP_REST_Response {
		// 1 query — all settings
		$settings = $this->settings_manager->all();

		// 6 queries — same as /analytics/overview
		$response_stats = $this->response_repository->getOverviewStats();
		$session_stats  = $this->session_repository->getOverviewSessionStats();
		$survey_stats   = $this->survey_repository->countPublishedWithNewCount();

		return $this->successResponse(
			[
				'settings' => $settings,
				'overview' => [
					'stats' => [
						'total_feedback' => [
							'value'  => $response_stats['total_feedback'],
							'change' => $this->weekOverWeekChange( $response_stats['this_week_count'], $response_stats['last_week_count'] ),
						],
						'completion_rate' => [
							'value'  => $session_stats['completion_rate'],
							'change' => $this->weekOverWeekChange( $session_stats['this_week_completion_rate'], $session_stats['last_week_completion_rate'] ),
						],
						'abandonment_rate' => [
							'value'  => $session_stats['abandonment_rate'],
							'change' => $this->weekOverWeekChange( $session_stats['this_week_abandonment_rate'], $session_stats['last_week_abandonment_rate'] ),
						],
						'avg_rating' => [
							'value'  => $response_stats['avg_score'],
							'change' => $this->weekOverWeekChange( $response_stats['this_week_avg_score'], $response_stats['last_week_avg_score'] ),
						],
						'active_surveys' => [
							'value'         => $survey_stats['total'],
							'new_this_week' => $survey_stats['new_this_week'],
							'change'        => $survey_stats['total'] > 0
								? round( $survey_stats['new_this_week'] / $survey_stats['total'] * 100, 1 )
								: null,
						],
					],
				],
			]
		);
	}

	/**
	 * Calculate week-over-week percentage change between two values.
	 *
	 * @param  int|float|null $current  Value for the current period.
	 * @param  int|float|null $previous Value for the previous period.
	 * @return float|null Percentage change, or null if not computable.
	 * @since  1.0.0
	 */
	private function weekOverWeekChange( int|float|null $current, int|float|null $previous ): ?float {
		if ( $current === null || $previous === null || $previous === 0 ) {
			return null;
		}

		return round( ( $current - $previous ) / $previous * 100, 1 );
	}
}
