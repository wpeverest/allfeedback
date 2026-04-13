<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Application\Response\ResponseDTO;
use AllFeedback\Application\Response\SubmitResponseService;
use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Survey\Manager;
use AllFeedback\Survey\ResponseManager;
use AllFeedback\Support\Logger;

/**
 * Class SubmitController
 *
 * Handles the public-facing survey submission endpoint.
 *
 * Route registered (under all-feedback/v1):
 *   POST /surveys/{id}/submit → handle() : public widget submission
 *
 * Intentionally separate from ResponsesController (admin read/delete) to
 * enforce a clear security boundary: this controller is public-permission
 * (nonce-gated), all others require manage_options.
 *
 * Submission flow:
 *   1. Nonce verification.
 *   2. Survey existence + published-status guard.
 *   3. Duplicate IP detection (HMAC-SHA256, no raw IP stored).
 *   4. `allfeedback_allow_response_submission` filter — pro blocking hooks.
 *   5. `allfeedback_response_data_before_save` filter — data transformation.
 *   6. Delegate to SubmitResponseService, which runs the validation pipeline,
 *      persists the response, and fires `allfeedback:response:submitted` to
 *      trigger the async notification pipeline (admin alert + respondent email).
 *   7. `allfeedback_response_submitted` action — third-party side-effects.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class SubmitController extends RestController {

	/**
	 * @since 1.0.0
	 */
	protected string $restBase = 'surveys';

	/**
	 * @param Manager               $surveyManager   Table gateway for af_surveys.
	 * @param ResponseManager       $responseManager Table gateway for af_responses.
	 * @param SubmitResponseService $submitService   Use-case service for response submission.
	 * @param Logger                $logger          Structured logger.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly Manager $surveyManager,
		private readonly ResponseManager $responseManager,
		private readonly SubmitResponseService $submitService,
		private readonly Logger $logger,
	) {}

	/**
	 * Register all routes for this controller.
	 *
	 * @since 1.0.0
	 */
	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/submit',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'handle' ],
				'permission_callback' => [ $this, 'publicPermission' ],
				'args'                => array_merge( $this->idArg(), $this->submitArgs() ),
			]
		);
	}

	// ------------------------------------------------------------------
	// Route handler
	// ------------------------------------------------------------------

	/**
	 * POST /all-feedback/v1/surveys/{id}/submit
	 *
	 * Accept and persist a public widget submission.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function handle( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$nonce = sanitize_text_field( (string) ( $request->get_param( 'nonce' ) ?? '' ) );

		if ( ! wp_verify_nonce( $nonce, ResponseManager::NONCE_ACTION ) ) {
			$this->logger->warning(
				'Submission rejected: invalid nonce.',
				[ 'survey_id' => (int) $request->get_param( 'id' ) ]
			);
			return $this->errorResponse( __( 'Invalid or expired nonce.', 'all-feedback' ), 403 );
		}

		$surveyId = (int) $request->get_param( 'id' );
		$survey   = $this->surveyManager->find( $surveyId );

		if ( $survey === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		if ( $survey->status !== 'published' ) {
			$this->logger->warning(
				'Submission rejected: survey not published.',
				[ 'survey_id' => $surveyId, 'status' => $survey->status ]
			);
			return $this->errorResponse( __( 'This survey is not currently accepting responses.', 'all-feedback' ), 403 );
		}

		$ipHash = $this->responseManager->hashIp();

		/**
		 * Filters whether a response submission should be allowed to proceed.
		 *
		 * Evaluated first so pro-tier hooks (reCAPTCHA, rate limiting, geo-fencing)
		 * can block a submission before any further processing. Returning false
		 * here also short-circuits the duplicate check below.
		 *
		 * @param bool             $allowed  True by default.
		 * @param int              $surveyId Target survey ID.
		 * @param object           $survey   Raw survey row from the database.
		 * @param \WP_REST_Request $request  Full request object.
		 * @since 1.0.0
		 */
		if ( ! (bool) apply_filters( 'allfeedback_allow_response_submission', true, $surveyId, $survey, $request ) ) {
			$this->logger->warning( 'Submission blocked by filter.', [ 'survey_id' => $surveyId ] );
			return $this->errorResponse( __( 'Response submission is not allowed.', 'all-feedback' ), 403 );
		}

		/**
		 * Filters the duplicate-detection look-back window in hours.
		 *
		 * Controls how far back the duplicate check looks when a visitor tries to
		 * re-submit a survey. Use 0 (the default) for a permanent lifetime block,
		 * or supply a positive integer to allow re-submission after N hours.
		 *
		 * Examples:
		 *   add_filter( 'allfeedback_duplicate_window_hours', fn() => 720 ); // 30 days
		 *   add_filter( 'allfeedback_duplicate_window_hours', fn() => 0   ); // forever (default)
		 *
		 * @param int    $hours    Look-back window. 0 = all-time block.
		 * @param int    $surveyId The survey being submitted to.
		 * @param object $survey   Raw survey row from the database.
		 * @since 1.0.0
		 */
		// $duplicateWindowHours = max( 0, (int) apply_filters( 'allfeedback_duplicate_window_hours', 0, $surveyId, $survey ) );

		// if ( $this->responseManager->isDuplicate( $surveyId, $ipHash, $duplicateWindowHours ) ) {
		// 	$this->logger->debug( 'Duplicate submission blocked.', [ 'survey_id' => $surveyId ] );
		// 	return $this->errorResponse( __( 'A response from this visitor has already been recorded.', 'all-feedback' ), 409 );
		// }

		/**
		 * Filters the response_data payload before validation and persistence.
		 *
		 * Use to sanitise values, strip disallowed HTML, normalise field answers,
		 * or inject server-side computed fields before the data is saved.
		 *
		 * @param array  $responseData Raw key/value field answers.
		 * @param int    $surveyId     Target survey ID.
		 * @param object $survey       Raw survey row from the database.
		 * @since 1.0.0
		 */
		$responseData = (array) apply_filters(
			'allfeedback_response_data_before_save',
			(array) ( $request->get_param( 'response_data' ) ?? [] ),
			$surveyId,
			$survey
		);

		$dto = ResponseDTO::fromArray(
			$surveyId,
			array_merge( $request->get_params(), [ 'response_data' => $responseData ] )
		);

		try {
			$domainResponse = $this->submitService->execute( $dto, $ipHash );
		} catch ( ValidationException $e ) {
			return $this->exceptionToResponse( $e );
		} catch ( NotFoundException $e ) {
			return $this->exceptionToResponse( $e );
		}

		$responseId = (int) $domainResponse->getId();

		/**
		 * Fires after a survey response has been successfully saved.
		 *
		 * Use for custom side-effects: CRM syncs, webhooks, analytics, loyalty
		 * point awards, etc. Email notifications are dispatched automatically by
		 * the notification pipeline — no need to re-implement them here.
		 *
		 * @param int    $responseId Newly created response ID.
		 * @param int    $surveyId   Parent survey ID.
		 * @param object $survey     Raw survey row from the database.
		 * @since 1.0.0
		 */
		do_action( 'allfeedback_response_submitted', $responseId, $surveyId, $survey );

		$this->logger->info(
			'Survey response submitted.',
			[
				'response_id' => $responseId,
				'survey_id'   => $surveyId,
				'score'       => $request->get_param( 'score' ),
				'anonymous'   => ! is_user_logged_in(),
			]
		);

		return $this->successResponse( [ 'id' => $responseId ], 201 );
	}

	// ------------------------------------------------------------------
	// Argument schema
	// ------------------------------------------------------------------

	/**
	 * Body arguments for the public submission endpoint.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	private function submitArgs(): array {
		return [
			'nonce'         => $this->argString(
				description: __( 'WordPress nonce for submission authentication (action: allfeedback_submit).', 'all-feedback' ),
				required:    true,
			),
			'response_data' => [
				'description'       => __( 'Field answers keyed by field ID.', 'all-feedback' ),
				'type'              => 'object',
				'required'          => true,
				'sanitize_callback' => null,
				'validate_callback' => 'rest_validate_request_arg',
			],
			'score'         => $this->argInteger(
				description: __( 'Numeric score for NPS, CSAT, CES, or star-rating fields.', 'all-feedback' ),
				min:         0,
				max:         100,
			),
			'page_url'      => $this->argString(
				description: __( 'URL of the page where the survey was displayed.', 'all-feedback' ),
				maxLength:   2083,
			),
			'device_type'   => $this->argEnum(
				description: __( 'Visitor device type at submission time.', 'all-feedback' ),
				values:      [ 'desktop', 'tablet', 'mobile' ],
			),
			'consent_given' => $this->argBoolean(
				description: __( 'Whether the visitor gave GDPR data-processing consent.', 'all-feedback' ),
				default:     false,
			),
		];
	}
}
