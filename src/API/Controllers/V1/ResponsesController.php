<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Survey\Manager;
use AllFeedback\Survey\ResponseManager;
use AllFeedback\Support\Logger;

/**
 * Class ResponsesController
 *
 * REST controller for survey responses.
 *
 * Routes registered (all under all-feedback/v1):
 *   GET  /surveys/{id}/responses          → index()  : paginated response list (admin)
 *   POST /surveys/{id}/responses          → store()  : public submission with nonce validation
 *   DELETE /surveys/{id}/responses/{rid}  → destroy(): delete a single response (admin)
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
	 * @param Manager         $surveyManager   Table gateway for af_surveys.
	 * @param ResponseManager $responseManager Table gateway for af_responses.
	 * @param Logger          $logger          Structured logger.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly Manager $surveyManager,
		private readonly ResponseManager $responseManager,
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
								description: __( 'Filter responses created on or after this date (Y-m-d).', 'all-feedback' ),
							),
							'date_to'   => $this->argString(
								description: __( 'Filter responses created on or before this date (Y-m-d).', 'all-feedback' ),
							),
						]
					),
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'store' ],
					'permission_callback' => '__return_true',
					'args'                => array_merge(
						$this->idArg(),
						$this->submitArgs()
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
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'destroy' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge(
						$this->idArg(),
						[
							'rid' => [
								'description'       => __( 'Unique identifier of the response.', 'all-feedback' ),
								'type'              => 'integer',
								'required'          => true,
								'minimum'           => 1,
								'sanitize_callback' => 'absint',
								'validate_callback' => 'rest_validate_request_arg',
							],
						]
					),
				],
			]
		);
	}

	// ------------------------------------------------------------------
	// Route handlers
	// ------------------------------------------------------------------

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

		if ( $this->surveyManager->find( $surveyId ) === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		$page     = max( 1, (int) ( $request->get_param( 'page' ) ?? 1 ) );
		$perPage  = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?? 20 ) ) );
		$offset   = ( $page - 1 ) * $perPage;
		$dateFrom = sanitize_text_field( (string) ( $request->get_param( 'date_from' ) ?? '' ) );
		$dateTo   = sanitize_text_field( (string) ( $request->get_param( 'date_to' ) ?? '' ) );

		$responses = $this->responseManager->findBySurvey( $surveyId, $perPage, $offset, $dateFrom, $dateTo );
		$total     = $this->responseManager->countBySurvey( $surveyId, $dateFrom, $dateTo );

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
	 * POST /all-feedback/v1/surveys/{id}/responses
	 *
	 * Accept a public widget submission.
	 * Validates the nonce, checks for duplicate IP submission, persists the
	 * response, and increments the survey's cached response count.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function store( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$nonce = sanitize_text_field( (string) ( $request->get_param( 'nonce' ) ?? '' ) );

		if ( ! wp_verify_nonce( $nonce, ResponseManager::NONCE_ACTION ) ) {
			$this->logger->warning( 'Response submission rejected: invalid nonce.', [ 'survey_id' => (int) $request->get_param( 'id' ) ] );
			return $this->errorResponse( __( 'Invalid or expired nonce.', 'all-feedback' ), 403 );
		}

		$surveyId = (int) $request->get_param( 'id' );
		$survey   = $this->surveyManager->find( $surveyId );

		if ( $survey === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		if ( $survey->status !== 'published' ) {
			$this->logger->warning(
				'Response submission rejected: survey not published.',
				[ 'survey_id' => $surveyId, 'status' => $survey->status ]
			);
			return $this->errorResponse( __( 'This survey is not currently accepting responses.', 'all-feedback' ), 403 );
		}

		$ipHash = $this->responseManager->hashIp();

		if ( $this->responseManager->isDuplicate( $surveyId, $ipHash ) ) {
			$this->logger->debug( 'Duplicate response blocked.', [ 'survey_id' => $surveyId ] );
			return $this->errorResponse( __( 'A response from this visitor has already been recorded.', 'all-feedback' ), 409 );
		}

		$newId = $this->responseManager->insert(
			[
				'survey_id'     => $surveyId,
				'response_data' => wp_json_encode( $request->get_param( 'response_data' ) ),
				'score'         => $request->get_param( 'score' ) !== null ? (int) $request->get_param( 'score' ) : null,
				'page_url'      => esc_url_raw( (string) ( $request->get_param( 'page_url' ) ?? '' ) ) ?: null,
				'device_type'   => sanitize_key( (string) ( $request->get_param( 'device_type' ) ?? '' ) ) ?: null,
				'ip_hash'       => $ipHash,
				'user_id'       => is_user_logged_in() ? get_current_user_id() : null,
				'consent_given' => (bool) $request->get_param( 'consent_given' ) ? 1 : 0,
				'created_at'    => current_time( 'mysql' ),
			]
		);

		if ( $newId === false ) {
			$this->logger->error( 'Response insert failed at DB layer.', [ 'survey_id' => $surveyId ] );
			return $this->errorResponse( __( 'Failed to save response.', 'all-feedback' ), 500 );
		}

		$this->surveyManager->incrementResponseCount( $surveyId );

		$this->logger->info(
			'Response received.',
			[
				'response_id' => $newId,
				'survey_id'   => $surveyId,
				'score'       => $request->get_param( 'score' ),
				'anonymous'   => ! is_user_logged_in(),
			]
		);

		return $this->successResponse( [ 'id' => $newId ], 201 );
	}

	/**
	 * DELETE /all-feedback/v1/surveys/{id}/responses/{rid}
	 *
	 * Permanently delete a single response record.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function destroy( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId   = (int) $request->get_param( 'id' );
		$responseId = (int) $request->get_param( 'rid' );

		$response = $this->responseManager->find( $responseId );

		if ( $response === null || (int) $response->survey_id !== $surveyId ) {
			return $this->notFoundResponse( __( 'Response', 'all-feedback' ) );
		}

		if ( ! $this->responseManager->delete( $responseId ) ) {
			$this->logger->error(
				'Response deletion failed at DB layer.',
				[ 'response_id' => $responseId, 'survey_id' => $surveyId, 'user_id' => get_current_user_id() ]
			);
			return $this->errorResponse( __( 'Failed to delete the response.', 'all-feedback' ), 500 );
		}

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
					'type'        => [ 'integer', 'null' ],
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
					'description' => __( 'WordPress user ID (null = anonymous).', 'all-feedback' ),
					'type'        => [ 'integer', 'null' ],
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'consent_given' => [
					'description' => __( 'Whether the visitor gave GDPR consent.', 'all-feedback' ),
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
	// Argument schemas
	// ------------------------------------------------------------------

	/**
	 * Body arguments for the public submission endpoint.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	private function submitArgs(): array {
		return [
			'response_data' => [
				'description'       => __( 'Field answers keyed by field ID.', 'all-feedback' ),
				'type'              => 'object',
				'required'          => true,
				'sanitize_callback' => null,
				'validate_callback' => 'rest_validate_request_arg',
			],
			'score'         => $this->argInteger(
				description: __( 'Numeric score for NPS, CSAT, or CES fields.', 'all-feedback' ),
				min:         0,
				max:         10,
			),
			'page_url'      => $this->argString(
				description: __( 'URL of the page where the survey was displayed.', 'all-feedback' ),
				maxLength:   2083,
			),
			'device_type'   => $this->argEnum(
				description: __( 'Visitor device type at submission time.', 'all-feedback' ),
				values:      [ 'desktop', 'tablet', 'mobile' ],
			),
			'nonce'         => $this->argString(
				description: __( 'WordPress nonce for submission authentication.', 'all-feedback' ),
				required:    true,
			),
			'consent_given' => $this->argBoolean(
				description: __( 'Whether the visitor gave GDPR consent.', 'all-feedback' ),
				default:     false,
			),
		];
	}

	// ------------------------------------------------------------------
	// Serialisation
	// ------------------------------------------------------------------

	/**
	 * Serialise a wpdb response row into the REST response shape.
	 *
	 * @param object $response Raw database row.
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	private function prepareResponse( object $response ): array {
		return [
			'id'            => (int) $response->id,
			'survey_id'     => (int) $response->survey_id,
			'response_data' => isset( $response->response_data ) && $response->response_data !== null
				? json_decode( $response->response_data, true )
				: null,
			'score'         => $response->score !== null ? (int) $response->score : null,
			'page_url'      => $response->page_url,
			'device_type'   => $response->device_type,
			'user_id'       => $response->user_id !== null ? (int) $response->user_id : null,
			'consent_given' => (bool) $response->consent_given,
			'created_at'    => $response->created_at,
		];
	}
}
