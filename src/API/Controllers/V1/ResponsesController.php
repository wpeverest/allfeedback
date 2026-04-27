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
 * Routes registered (all under allfeedback/v1):
 *   GET    /responses                        → indexAll()         : paginated list across all surveys
 *   DELETE /responses/delete                  → destroyManyGlobal() : bulk delete by ID (any survey)
 *   POST   /responses/mark-read               → markManyRead()      : bulk mark responses as read
 *   POST   /responses/mark-unread             → markManyUnread()    : bulk mark responses as unread
 *   GET    /surveys/{id}/responses           → index()       : paginated response list for one survey
 *   DELETE /surveys/{id}/responses/delete    → destroyMany() : bulk delete responses by ID
 *   GET    /surveys/{id}/responses/{rid}     → show()        : single response
 *   PUT    /surveys/{id}/responses/{rid}     → update()      : patch response_data / is_read
 *   DELETE /surveys/{id}/responses/{rid}     → destroy()     : delete a single response
 *
 * Public submission is handled by SubmitController (POST /surveys/{id}/submit)
 * to maintain a clear security boundary between public and admin endpoints.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class ResponsesController extends RestController {

	/**
	 * Route base for survey resources.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $restBase = 'surveys';

	/**
	 * @param  SurveyRepository   $surveyRepository   Repository for survey lookups.
	 * @param  ResponseRepository $responseRepository Repository for response reads and writes.
	 * @param  Logger             $logger             Structured logger.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SurveyRepository $surveyRepository,
		private readonly ResponseRepository $responseRepository,
		private readonly Logger $logger,
	) {}

	/**
	 * Register all routes for this controller.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerRoutes(): void {
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
								description: __( 'Filter responses on or after this date (Y-m-d).', 'allfeedback' ),
							),
							'date_to'   => $this->argString(
								description: __( 'Filter responses on or before this date (Y-m-d).', 'allfeedback' ),
							),
						]
					),
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/responses/delete',
			[
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'destroyManyGlobal' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => [
					'ids' => [
						'description' => __( 'Array of response IDs to permanently delete.', 'allfeedback' ),
						'type'        => 'array',
						'required'    => true,
						'items'       => [
							'type'    => 'integer',
							'minimum' => 1,
						],
						'minItems'    => 1,
					],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/responses/mark-read',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'markManyRead' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => [ 'ids' => $this->idsArg() ],
			]
		);

		register_rest_route(
			$this->namespace,
			'/responses/mark-unread',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'markManyUnread' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => [ 'ids' => $this->idsArg() ],
			]
		);

		register_rest_route(
			$this->namespace,
			'/responses/unread-count',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'unreadCount' ],
				'permission_callback' => [ $this, 'adminPermission' ],
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
								description: __( 'Filter responses on or after this date (Y-m-d).', 'allfeedback' ),
							),
							'date_to'   => $this->argString(
								description: __( 'Filter responses on or before this date (Y-m-d).', 'allfeedback' ),
							),
						]
					),
				],
				'schema' => [ $this, 'getPublicItemSchema' ],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/responses/delete',
			[
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'destroyMany' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => array_merge(
					$this->idArg(),
					[
						'ids' => [
							'description' => __( 'Array of response IDs to permanently delete.', 'allfeedback' ),
							'type'        => 'array',
							'required'    => true,
							'items'       => [
								'type'    => 'integer',
								'minimum' => 1,
							],
							'minItems'    => 1,
						],
					]
				),
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
								'description' => __( 'Field answers keyed by field ID.', 'allfeedback' ),
								'type'        => [ 'object', 'array', 'null' ],
								'required'    => false,
							],
							'is_read'       => [
								'description' => __( 'Whether the response has been read by an admin.', 'allfeedback' ),
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

	/**
	 * GET /allfeedback/v1/responses
	 *
	 * Return a paginated list of all responses across every survey.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
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
	 * DELETE /allfeedback/v1/responses/delete
	 *
	 * Bulk-delete multiple responses by ID across any survey.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function destroyManyGlobal( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$ids = array_values( array_filter( array_map( 'absint', (array) ( $request->get_param( 'ids' ) ?? [] ) ) ) );

		if ( empty( $ids ) ) {
			return $this->errorResponse( __( 'No response IDs provided.', 'allfeedback' ), 422 );
		}

		$deleted = 0;
		$failed  = [];

		foreach ( $ids as $id ) {
			if ( $this->responseRepository->findById( $id ) === null ) {
				$failed[] = $id;
				continue;
			}

			if ( $this->responseRepository->delete( $id ) ) {
				++$deleted;
			} else {
				$failed[] = $id;
			}
		}

		$this->logger->info(
			'Global bulk response deletion completed.',
			[
				'requested'     => $ids,
				'deleted_count' => $deleted,
				'failed'        => $failed,
				'user_id'       => get_current_user_id(),
			]
		);

		return $this->successResponse(
			[
				'deleted' => $deleted,
				'failed'  => $failed,
			]
		);
	}

	/**
	 * POST /allfeedback/v1/responses/mark-read
	 *
	 * Bulk mark responses as read across any survey.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function markManyRead( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		return $this->bulkSetReadStatus( $request, true );
	}

	/**
	 * POST /allfeedback/v1/responses/mark-unread
	 *
	 * Bulk mark responses as unread across any survey.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function markManyUnread( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		return $this->bulkSetReadStatus( $request, false );
	}

	/**
	 * GET /allfeedback/v1/responses/unread-count
	 *
	 * Return the total number of unread responses across all surveys.
	 * Used by the React admin to keep the WP sidebar badge in sync without a reload.
	 *
	 * @return \WP_REST_Response
	 * @since  1.0.0
	 */
	public function unreadCount(): \WP_REST_Response {
		return $this->successResponse( [ 'count' => $this->responseRepository->countUnread() ] );
	}

	/**
	 * GET /allfeedback/v1/surveys/{id}/responses
	 *
	 * Return a paginated list of responses for a survey.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId = (int) $request->get_param( 'id' );

		$survey = $this->surveyRepository->findById( $surveyId );

		if ( $survey === null ) {
			return $this->notFoundResponse( __( 'Survey', 'allfeedback' ) );
		}

		if ( $survey->getStatus()->isTrashed() ) {
			$perPage = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?? 20 ) ) );
			return $this->successResponse(
				[
					'responses' => [],
					'total'     => 0,
					'page'      => 1,
					'per_page'  => $perPage,
				]
			);
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
	 * GET /allfeedback/v1/surveys/{id}/responses/{rid}
	 *
	 * Return a single response record.
	 * Verifies the response belongs to the given survey.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function show( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId   = (int) $request->get_param( 'id' );
		$responseId = (int) $request->get_param( 'rid' );

		$response = $this->responseRepository->findById( $responseId );

		if ( $response === null || $response->getSurveyId() !== $surveyId ) {
			return $this->notFoundResponse( __( 'Response', 'allfeedback' ) );
		}

		return $this->successResponse( $this->prepareResponse( $response ) );
	}

	/**
	 * PUT /allfeedback/v1/surveys/{id}/responses/{rid}
	 *
	 * Patch response_data and/or is_read on an existing response.
	 * Verifies the response belongs to the given survey before saving.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function update( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId   = (int) $request->get_param( 'id' );
		$responseId = (int) $request->get_param( 'rid' );

		$response = $this->responseRepository->findById( $responseId );

		if ( $response === null || $response->getSurveyId() !== $surveyId ) {
			return $this->notFoundResponse( __( 'Response', 'allfeedback' ) );
		}

		$updatePayload = [];

		$rawData = $request->get_param( 'response_data' );
		if ( $rawData !== null ) {
			if ( $rawData instanceof \stdClass ) {
				$rawData = (array) $rawData;
			}

			$responseDataJson = wp_json_encode( $rawData );

			if ( $responseDataJson === false ) {
				return $this->errorResponse( __( 'Invalid response_data: could not encode as JSON.', 'allfeedback' ), 400 );
			}

			$updatePayload['response_data'] = $responseDataJson;
		}

		$isRead = $request->get_param( 'is_read' );
		if ( $isRead !== null ) {
			$updatePayload['is_read'] = $isRead ? 1 : 0;
		}

		if ( empty( $updatePayload ) ) {
			return $this->successResponse( $this->prepareResponse( $response ) );
		}

		if ( ! $this->responseRepository->update( $responseId, $updatePayload ) ) {
			$this->logger->error(
				'Response update failed at DB layer.',
				[ 'response_id' => $responseId, 'survey_id' => $surveyId, 'user_id' => get_current_user_id() ]
			);
			return $this->errorResponse( __( 'Failed to update the response.', 'allfeedback' ), 500 );
		}

		$this->logger->info(
			'Response updated.',
			[ 'response_id' => $responseId, 'survey_id' => $surveyId, 'user_id' => get_current_user_id() ]
		);

		$updated = $this->responseRepository->findById( $responseId );

		if ( $updated === null ) {
			return $this->errorResponse( __( 'Response not found after update.', 'allfeedback' ), 500 );
		}

		return $this->successResponse( $this->prepareResponse( $updated ) );
	}

	/**
	 * DELETE /allfeedback/v1/surveys/{id}/responses/delete
	 *
	 * Bulk-delete multiple responses by ID.
	 * Only deletes responses that belong to the given survey — others are counted as failures.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function destroyMany( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId = (int) $request->get_param( 'id' );
		$ids      = array_values( array_filter( array_map( 'absint', (array) ( $request->get_param( 'ids' ) ?? [] ) ) ) );

		if ( empty( $ids ) ) {
			return $this->errorResponse( __( 'No response IDs provided.', 'allfeedback' ), 422 );
		}

		if ( $this->surveyRepository->findById( $surveyId ) === null ) {
			return $this->notFoundResponse( __( 'Survey', 'allfeedback' ) );
		}

		$deleted = 0;
		$failed  = [];

		foreach ( $ids as $id ) {
			$response = $this->responseRepository->findById( $id );

			if ( $response === null || $response->getSurveyId() !== $surveyId ) {
				$failed[] = $id;
				continue;
			}

			if ( $this->responseRepository->delete( $id ) ) {
				++$deleted;
			} else {
				$failed[] = $id;
			}
		}

		$this->logger->info(
			'Bulk response deletion completed.',
			[
				'survey_id'     => $surveyId,
				'requested'     => $ids,
				'deleted_count' => $deleted,
				'failed'        => $failed,
				'user_id'       => get_current_user_id(),
			]
		);

		return $this->successResponse(
			[
				'deleted' => $deleted,
				'failed'  => $failed,
			]
		);
	}

	/**
	 * DELETE /allfeedback/v1/surveys/{id}/responses/{rid}
	 *
	 * Permanently delete a single response record.
	 * Verifies the response belongs to the given survey before deleting.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function destroy( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId   = (int) $request->get_param( 'id' );
		$responseId = (int) $request->get_param( 'rid' );

		$response = $this->responseRepository->findById( $responseId );

		if ( $response === null || $response->getSurveyId() !== $surveyId ) {
			return $this->notFoundResponse( __( 'Response', 'allfeedback' ) );
		}

		if ( ! $this->responseRepository->delete( $responseId ) ) {
			$this->logger->error(
				'Response deletion failed at DB layer.',
				[ 'response_id' => $responseId, 'survey_id' => $surveyId, 'user_id' => get_current_user_id() ]
			);
			return $this->errorResponse( __( 'Failed to delete the response.', 'allfeedback' ), 500 );
		}

		$this->surveyRepository->decrementResponseCount( $surveyId );

		$this->logger->info(
			'Response deleted.',
			[ 'response_id' => $responseId, 'survey_id' => $surveyId, 'user_id' => get_current_user_id() ]
		);

		return $this->successResponse( [ 'deleted' => true, 'id' => $responseId ] );
	}

	/**
	 * JSON schema for a single response item.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	public function getPublicItemSchema(): array {
		return [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'allfeedback_response',
			'type'       => 'object',
			'properties' => [
				'id'            => [
					'description' => __( 'Unique identifier.', 'allfeedback' ),
					'type'        => 'integer',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'survey_id'     => [
					'description' => __( 'Parent survey identifier.', 'allfeedback' ),
					'type'        => 'integer',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'response_data' => [
					'description' => __( 'Field answers keyed by field ID.', 'allfeedback' ),
					'type'        => [ 'object', 'null' ],
					'context'     => [ 'view' ],
				],
				'score'         => [
					'description' => __( 'Numeric score for NPS fields.', 'allfeedback' ),
					'type'        => [ 'number', 'null' ],
					'context'     => [ 'view' ],
				],
				'page_url'      => [
					'description' => __( 'URL of the page where the survey was displayed.', 'allfeedback' ),
					'type'        => [ 'string', 'null' ],
					'context'     => [ 'view' ],
				],
				'device_type'   => [
					'description' => __( 'Visitor device type.', 'allfeedback' ),
					'type'        => [ 'string', 'null' ],
					'context'     => [ 'view' ],
				],
				'user_id'       => [
					'description' => __( 'WordPress user ID (null for anonymous submissions).', 'allfeedback' ),
					'type'        => [ 'integer', 'null' ],
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'is_read'       => [
					'description' => __( 'Whether an admin has read this response.', 'allfeedback' ),
					'type'        => 'boolean',
					'context'     => [ 'view' ],
				],
				'created_at'    => [
					'description' => __( 'Submission timestamp (MySQL datetime).', 'allfeedback' ),
					'type'        => 'string',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
			],
		];
	}

	/**
	 * Serialise a Response aggregate into the REST response shape.
	 *
	 * @param  Response $response Response aggregate root.
	 * @return array<string, mixed>
	 * @since  1.0.0
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
			'ip_address'    => $response->getIpAddress(),
			'is_read'       => $response->isRead(),
			'created_at'    => $response->getCreatedAt()->format( 'Y-m-d H:i:s' ),
		];
	}

	/**
	 * Shared `rid` (response ID) argument definition.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	private function ridArg(): array {
		return [
			'description'       => __( 'Unique identifier of the response.', 'allfeedback' ),
			'type'              => 'integer',
			'required'          => true,
			'minimum'           => 1,
			'sanitize_callback' => 'absint',
			'validate_callback' => 'rest_validate_request_arg',
		];
	}

	/**
	 * Shared `ids` array argument definition used by bulk endpoints.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	private function idsArg(): array {
		return [
			'description' => __( 'Array of response IDs to operate on.', 'allfeedback' ),
			'type'        => 'array',
			'required'    => true,
			'items'       => [
				'type'    => 'integer',
				'minimum' => 1,
			],
			'minItems'    => 1,
		];
	}

	/**
	 * Shared implementation for bulk mark-read / mark-unread.
	 *
	 * Iterates over the provided IDs and updates the `is_read` column on each
	 * response that exists. Non-existent IDs are counted as failures.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @param  bool             $isRead  True = mark as read, false = mark as unread.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	private function bulkSetReadStatus( \WP_REST_Request $request, bool $isRead ): \WP_REST_Response|\WP_Error {
		$ids = array_values( array_filter( array_map( 'absint', (array) ( $request->get_param( 'ids' ) ?? [] ) ) ) );

		if ( empty( $ids ) ) {
			return $this->errorResponse( __( 'No response IDs provided.', 'allfeedback' ), 422 );
		}

		$failed  = $this->responseRepository->bulkUpdateReadStatus( $ids, $isRead );
		$updated = count( $ids ) - count( $failed );

		$this->logger->info(
			'Bulk response read-status update.',
			[
				'is_read'       => $isRead,
				'requested'     => $ids,
				'updated_count' => $updated,
				'failed'        => $failed,
				'user_id'       => get_current_user_id(),
			]
		);

		return $this->successResponse(
			[
				'updated' => $updated,
				'failed'  => $failed,
			]
		);
	}
}
