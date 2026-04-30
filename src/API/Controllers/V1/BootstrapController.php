<?php

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

	protected string $restBase = 'bootstrap';

	public function __construct(
		private readonly SettingsManager $settingsManager,
		private readonly SurveyRepository $surveyRepository,
		private readonly SurveySessionRepository $sessionRepository,
		private readonly ResponseRepository $responseRepository,
	) {}

	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase,
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
		$settings = $this->settingsManager->all();

		// 6 queries — same as /analytics/overview
		$responseStats = $this->responseRepository->getOverviewStats();
		$sessionStats  = $this->sessionRepository->getOverviewSessionStats();
		$surveyStats   = $this->surveyRepository->countPublishedWithNewCount();

		return $this->successResponse( [
			'settings' => $settings,
			'overview' => [
				'stats' => [
					'total_feedback' => [
						'value'  => $responseStats['total_feedback'],
						'change' => $this->weekOverWeekChange( $responseStats['this_week_count'], $responseStats['last_week_count'] ),
					],
					'completion_rate' => [
						'value'  => $sessionStats['completion_rate'],
						'change' => $this->weekOverWeekChange( $sessionStats['this_week_completion_rate'], $sessionStats['last_week_completion_rate'] ),
					],
					'abandonment_rate' => [
						'value'  => $sessionStats['abandonment_rate'],
						'change' => $this->weekOverWeekChange( $sessionStats['this_week_abandonment_rate'], $sessionStats['last_week_abandonment_rate'] ),
					],
					'avg_rating' => [
						'value'  => $responseStats['avg_score'],
						'change' => $this->weekOverWeekChange( $responseStats['this_week_avg_score'], $responseStats['last_week_avg_score'] ),
					],
					'active_surveys' => [
						'value'         => $surveyStats['total'],
						'new_this_week' => $surveyStats['new_this_week'],
						'change'        => $surveyStats['total'] > 0
							? round( $surveyStats['new_this_week'] / $surveyStats['total'] * 100, 1 )
							: null,
					],
				],
			],
		] );
	}

	private function weekOverWeekChange( int|float|null $current, int|float|null $previous ): ?float {
		if ( $current === null || $previous === null || $previous == 0 ) {
			return null;
		}

		return round( ( $current - $previous ) / $previous * 100, 1 );
	}
}
