<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Domain\Response\Response;
use AllFeedback\Domain\Response\ResponseFilter;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Support\Logger;

/**
 * Class ResponsesController
 *
 * Admin REST controller for reading and deleting survey responses.
 *
 * Routes registered (all under all-feedback/v1):
 *   GET    /responses                     → indexAll() : paginated list across all surveys
 *   GET    /surveys/{id}/responses        → index()    : paginated response list for one survey
 *   GET    /surveys/{id}/responses/{rid}  → show()     : single response
 *   PUT    /surveys/{id}/responses/{rid}  → update()   : patch response_data / is_read
 *   DELETE /surveys/{id}/responses/{rid}  → destroy()  : delete a single response
 *
 * Public submission is handled by SubmitController (POST /surveys/{id}/submit)
 * to maintain a clear security boundary between public and admin endpoints.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class ResponsesController extends RestController {

	/**
	 * @since 1.0.0
	 */
	protected string $restBase = 'surveys';

	/**
	 * @param SurveyRepository   $surveyRepository   Repository for survey lookups.
	 * @param ResponseRepository $responseRepository Repository for response reads and writes.
	 * @param Logger             $logger             Structured logger.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly ResponseRepository $responseRepository,
		private readonly Logger $logger,
	) {}

	/**
	 * Register all routes for this controller.
	 *
	 * @since 1.0.0
	 */
	public function registerRoutes(): void {
		// Global responses — all surveys.
		register_rest_route(
			$this->namespace,
			'/responses',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'indexAll' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge(
						$this->paginationArgs( defaultPerPage: 20, maxPerPage: 100 ),
						[
							'date_from' => $this->argString(
								description: __( 'Filter responses on or after this date (Y-m-d).', 'all-feedback' ),
							),
							'date_to'   => $this->argString(
								description: __( 'Filter responses on or before this date (Y-m-d).', 'all-feedback' ),
							),
						]
					),
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/responses',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge(
						$this->idArg(),
						$this->paginationArgs( defaultPerPage: 20, maxPerPage: 100 ),
						[
							'date_from' => $this->argString(
								description: __( 'Filter responses on or after this date (Y-m-d).', 'all-feedback' ),
							),
							'date_to'   => $this->argString(
								description: __( 'Filter responses on or before this date (Y-m-d).', 'all-feedback' ),
							),
						]
					),
				],
				'schema' => [ $this, 'getPublicItemSchema' ],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/responses/(?P<rid>\d+)',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'show' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge(
						$this->idArg(),
						[ 'rid' => $this->ridArg() ]
					),
				],
				[
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge(
						$this->idArg(),
						[
							'rid'           => $this->ridArg(),
							'response_data' => [
								'description' => __( 'Field answers keyed by field ID.', 'all-feedback' ),
								'type'        => [ 'object', 'array', 'null' ],
								'required'    => false,
							],
							'is_read'       => [
								'description' => __( 'Whether the response has been read by an admin.', 'all-feedback' ),
								'type'        => 'boolean',
								'required'    => false,
							],
						]
					),
				],
				[
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'destroy' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge(
						$this->idArg(),
						[ 'rid' => $this->ridArg() ]
					),
				],
			]
		);
	}

	// ------------------------------------------------------------------
	// Route handlers
	// ------------------------------------------------------------------

	/**
	 * GET /all-feedback/v1/responses
	 *
	 * Return a paginated list of all responses across every survey.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function indexAll( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$page     = max( 1, (int) ( $request->get_param( 'page' ) ?? 1 ) );
		$perPage  = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?? 20 ) ) );
		$dateFrom = sanitize_text_field( (string) ( $request->get_param( 'date_from' ) ?? '' ) );
		$dateTo   = sanitize_text_field( (string) ( $request->get_param( 'date_to' ) ?? '' ) );

		$filter = new ResponseFilter(
			dateFrom: $dateFrom !== '' ? $dateFrom : null,
			dateTo:   $dateTo !== '' ? $dateTo : null,
			page:     $page,
			perPage:  $perPage,
		);

		$responses = $this->responseRepository->findAll( $filter );
		$total     = $this->responseRepository->countAll( $filter );

		return $this->successResponse(
			[
				'responses' => array_map( [ $this, 'prepareResponse' ], $responses ),
				'total'     => $total,
				'page'      => $page,
				'per_page'  => $perPage,
			]
		);
	}

	/**
	 * GET /all-feedback/v1/surveys/{id}/responses
	 *
	 * Return a paginated list of responses for a survey.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId = (int) $request->get_param( 'id' );

		if ( $this->surveyRepository->findById( $surveyId ) === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		$page     = max( 1, (int) ( $request->get_param( 'page' ) ?? 1 ) );
		$perPage  = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?? 20 ) ) );
		$dateFrom = sanitize_text_field( (string) ( $request->get_param( 'date_from' ) ?? '' ) );
		$dateTo   = sanitize_text_field( (string) ( $request->get_param( 'date_to' ) ?? '' ) );

		$filter = new ResponseFilter(
			dateFrom: $dateFrom !== '' ? $dateFrom : null,
			dateTo:   $dateTo !== '' ? $dateTo : null,
			page:     $page,
			perPage:  $perPage,
		);

		$responses = $this->responseRepository->findBySurveyId( $surveyId, $filter );
		$total     = $this->responseRepository->countBySurveyId( $surveyId, $filter );

		return $this->successResponse(
			[
				'responses' => array_map( [ $this, 'prepareResponse' ], $responses ),
				'total'     => $total,
				'page'      => $page,
				'per_page'  => $perPage,
			]
		);
	}

	/**
	 * GET /all-feedback/v1/surveys/{id}/responses/{rid}
	 *
	 * Return a single response record.
	 * Verifies the response belongs to the given survey.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function show( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId   = (int) $request->get_param( 'id' );
		$responseId = (int) $request->get_param( 'rid' );

		$response = $this->responseRepository->findById( $responseId );

		if ( $response === null || $response->getSurveyId() !== $surveyId ) {
			return $this->notFoundResponse( __( 'Response', 'all-feedback' ) );
		}

		return $this->successResponse( $this->prepareResponse( $response ) );
	}

	/**
	 * PUT /all-feedback/v1/surveys/{id}/responses/{rid}
	 *
	 * Patch response_data and/or is_read on an existing response.
	 * Verifies the response belongs to the given survey before saving.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function update( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId   = (int) $request->get_param( 'id' );
		$responseId = (int) $request->get_param( 'rid' );

		$response = $this->responseRepository->findById( $responseId );

		if ( $response === null || $response->getSurveyId() !== $surveyId ) {
			return $this->notFoundResponse( __( 'Response', 'all-feedback' ) );
		}

		$updatePayload = [];

		// Handle response_data if provided.
		$rawData = $request->get_param( 'response_data' );
		if ( $rawData !== null ) {
			if ( $rawData instanceof \stdClass ) {
				$rawData = (array) $rawData;
			}

			$responseDataJson = wp_json_encode( $rawData );

			if ( $responseDataJson === false ) {
				return $this->errorResponse( __( 'Invalid response_data: could not encode as JSON.', 'all-feedback' ), 400 );
			}

			$updatePayload['response_data'] = $responseDataJson;
		}

		// Handle is_read if provided.
		$isRead = $request->get_param( 'is_read' );
		if ( $isRead !== null ) {
			$updatePayload['is_read'] = $isRead ? 1 : 0;
		}

		// Nothing to update — return current state.
		if ( empty( $updatePayload ) ) {
			return $this->successResponse( $this->prepareResponse( $response ) );
		}

		if ( ! $this->responseRepository->update( $responseId, $updatePayload ) ) {
			$this->logger->error(
				'Response update failed at DB layer.',
				[ 'response_id' => $responseId, 'survey_id' => $surveyId, 'user_id' => get_current_user_id() ]
			);
			return $this->errorResponse( __( 'Failed to update the response.', 'all-feedback' ), 500 );
		}

		$this->logger->info(
			'Response updated.',
			[ 'response_id' => $responseId, 'survey_id' => $surveyId, 'user_id' => get_current_user_id() ]
		);

		$updated = $this->responseRepository->findById( $responseId );

		if ( $updated === null ) {
			return $this->errorResponse( __( 'Response not found after update.', 'all-feedback' ), 500 );
		}

		return $this->successResponse( $this->prepareResponse( $updated ) );
	}

	/**
	 * DELETE /all-feedback/v1/surveys/{id}/responses/{rid}
	 *
	 * Permanently delete a single response record.
	 * Verifies the response belongs to the given survey before deleting.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function destroy( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId   = (int) $request->get_param( 'id' );
		$responseId = (int) $request->get_param( 'rid' );

		$response = $this->responseRepository->findById( $responseId );

		if ( $response === null || $response->getSurveyId() !== $surveyId ) {
			return $this->notFoundResponse( __( 'Response', 'all-feedback' ) );
		}

		if ( ! $this->responseRepository->delete( $responseId ) ) {
			$this->logger->error(
				'Response deletion failed at DB layer.',
				[ 'response_id' => $responseId, 'survey_id' => $surveyId, 'user_id' => get_current_user_id() ]
			);
			return $this->errorResponse( __( 'Failed to delete the response.', 'all-feedback' ), 500 );
		}

		$this->surveyRepository->decrementResponseCount( $surveyId );

		$this->logger->info(
			'Response deleted.',
			[ 'response_id' => $responseId, 'survey_id' => $surveyId, 'user_id' => get_current_user_id() ]
		);

		return $this->successResponse( [ 'deleted' => true, 'id' => $responseId ] );
	}

	// ------------------------------------------------------------------
	// Schema
	// ------------------------------------------------------------------

	/**
	 * JSON schema for a single response item.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function getPublicItemSchema(): array {
		return [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'allfeedback_response',
			'type'       => 'object',
			'properties' => [
				'id'            => [
					'description' => __( 'Unique identifier.', 'all-feedback' ),
					'type'        => 'integer',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'survey_id'     => [
					'description' => __( 'Parent survey identifier.', 'all-feedback' ),
					'type'        => 'integer',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'response_data' => [
					'description' => __( 'Field answers keyed by field ID.', 'all-feedback' ),
					'type'        => [ 'object', 'null' ],
					'context'     => [ 'view' ],
				],
				'score'         => [
					'description' => __( 'Numeric score for NPS, CSAT, or CES fields.', 'all-feedback' ),
					'type'        => [ 'number', 'null' ],
					'context'     => [ 'view' ],
				],
				'page_url'      => [
					'description' => __( 'URL of the page where the survey was displayed.', 'all-feedback' ),
					'type'        => [ 'string', 'null' ],
					'context'     => [ 'view' ],
				],
				'device_type'   => [
					'description' => __( 'Visitor device type.', 'all-feedback' ),
					'type'        => [ 'string', 'null' ],
					'context'     => [ 'view' ],
				],
				'user_id'       => [
					'description' => __( 'WordPress user ID (null for anonymous submissions).', 'all-feedback' ),
					'type'        => [ 'integer', 'null' ],
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'consent_given' => [
					'description' => __( 'Whether the visitor gave GDPR consent.', 'all-feedback' ),
					'type'        => 'boolean',
					'context'     => [ 'view' ],
				],
				'is_read'       => [
					'description' => __( 'Whether an admin has read this response.', 'all-feedback' ),
					'type'        => 'boolean',
					'context'     => [ 'view' ],
				],
				'created_at'    => [
					'description' => __( 'Submission timestamp (MySQL datetime).', 'all-feedback' ),
					'type'        => 'string',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
			],
		];
	}

	// ------------------------------------------------------------------
	// Serialisation
	// ------------------------------------------------------------------

	/**
	 * Serialise a Response aggregate into the REST response shape.
	 *
	 * @param Response $response Response aggregate root.
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	private function prepareResponse( Response $response ): array {
		$responseData = $response->getResponseData();

		return [
			'id'            => $response->getId(),
			'survey_id'     => $response->getSurveyId(),
			'response_data' => $responseData !== [] ? $responseData : null,
			'score'         => $response->getScore() !== null ? (int) $response->getScore() : null,
			'page_url'      => $response->getPageUrl(),
			'device_type'   => $response->getDeviceType(),
			'user_id'       => $response->getUserId(),
			'consent_given' => $response->isConsentGiven(),
			'is_read'       => $response->isRead(),
			'created_at'    => $response->getCreatedAt()->format( 'Y-m-d H:i:s' ),
		];
	}

	// ------------------------------------------------------------------
	// Argument helpers
	// ------------------------------------------------------------------

	/**
	 * Shared `rid` (response ID) argument definition.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	private function ridArg(): array {
		return [
			'description'       => __( 'Unique identifier of the response.', 'all-feedback' ),
			'type'              => 'integer',
			'required'          => true,
			'minimum'           => 1,
			'sanitize_callback' => 'absint',
			'validate_callback' => 'rest_validate_request_arg',
		];
	}
}
