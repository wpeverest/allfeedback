<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Application\Survey\SurveyStateService;
use AllFeedback\Domain\Survey\SurveyRepository;

/**
 * Class SurveyStateController
 *
 * REST controller for recording per-user survey display state.
 *
 * Route (under all-feedback/v1):
 *   POST /surveys/{id}/state  →  handle()  : logged-in users only
 *
 * This endpoint is the server-side counterpart of the JS StateManager.
 * The frontend fires it (fire-and-forget) for impression, dismiss, and submit
 * events so the state persists across devices for logged-in users.
 *
 * Guests use localStorage exclusively — they never hit this endpoint.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class SurveyStateController extends RestController {

	/**
	 * @since 1.0.0
	 */
	protected string $restBase = 'surveys';

	/**
	 * @param  SurveyStateService $stateService     Reads/writes user_meta survey state.
	 * @param  SurveyRepository   $surveyRepository Used to verify the survey exists.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyStateService $stateService,
		private readonly SurveyRepository $surveyRepository,
	) {}

	/**
	 * Register the /surveys/{id}/state route.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/state',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'handle' ],
				'permission_callback' => 'is_user_logged_in',
				'args'                => array_merge(
					$this->idArg(),
					[
						'action' => [
							'description'       => __( 'State mutation to record.', 'allfeedback' ),
							'type'              => 'string',
							'required'          => true,
							'enum'              => [ 'impression', 'dismiss', 'submit' ],
							'sanitize_callback' => 'sanitize_key',
						],
					]
				),
			]
		);
	}

	/**
	 * POST /all-feedback/v1/surveys/{id}/state
	 *
	 * Record an impression, dismissal, or submission for the current user.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function handle( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId = (int) $request->get_param( 'id' );
		$userId   = get_current_user_id();
		$action   = (string) $request->get_param( 'action' );

		$survey = $this->surveyRepository->findById( $surveyId );

		if ( $survey === null || ! $survey->getStatus()->isPublished() ) {
			return $this->notFoundResponse( __( 'Survey', 'allfeedback' ) );
		}

		match ( $action ) {
			'impression' => $this->stateService->recordImpression( $userId, $surveyId ),
			'dismiss'    => $this->stateService->recordDismissal( $userId, $surveyId ),
			'submit'     => $this->stateService->recordSubmit( $userId, $surveyId ),
		};

		return $this->successResponse( [ 'ok' => true ] );
	}
}
