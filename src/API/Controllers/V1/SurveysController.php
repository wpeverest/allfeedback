<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyFilter;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Domain\Survey\SurveyStatus;
use AllFeedback\Support\Logger;

/**
 * Class SurveysController
 *
 * REST controller for the /surveys resource.
 *
 * Routes registered (all under all-feedback/v1):
 *   GET    /surveys                      → index()                : paginated list
 *   POST   /surveys                      → store()               : create
 *   DELETE /surveys/trash                → destroyMany()          : bulk trash
 *   DELETE /surveys/delete               → destroyManyPermanent() : bulk permanent delete
 *   GET    /surveys/{id}                 → show()                 : single survey
 *   PUT    /surveys/{id}                 → update()               : full or partial update / autosave
 *   DELETE /surveys/{id}/trash           → destroy()              : move to trash
 *   DELETE /surveys/{id}/delete          → destroyPermanent()     : permanent delete (must be trashed first)
 *   POST   /surveys/{id}/duplicate       → duplicate()            : copy survey
 *   POST   /surveys/{id}/publish         → publish()              : set status to published
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class SurveysController extends RestController {

	/**
	 * Valid field types the form builder may use inside form_schema.
	 *
	 * Names must match the `type` values emitted by the React builder exactly.
	 *
	 * @var string[]
	 * @since 1.0.0
	 */
	private const FIELD_TYPES = [
		'nps', 'csat', 'ces',
		'short_text', 'long_text',
		'radio', 'checkboxes', 'dropdown',
		'star_rating', 'scale',
		'email', 'yes_no',
	];

	/**
	 * Route base for survey resources.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $restBase = 'surveys';

	/**
	 * @param  SurveyRepository   $surveyRepository   Survey aggregate repository.
	 * @param  ResponseRepository $responseRepository Response aggregate repository.
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
			'/' . $this->restBase,
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => $this->collectionArgs(),
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'store' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => $this->writeArgs( required: true ),
				],
				'schema' => [ $this, 'getPublicItemSchema' ],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'show' ],
					'permission_callback' => [ $this, 'publicPermission' ],
					'args'                => $this->idArg(),
				],
				[
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge( $this->idArg(), $this->writeArgs( required: false ) ),
				],
				'schema' => [ $this, 'getPublicItemSchema' ],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/trash',
			[
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'destroyMany' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => $this->bulkActionArgs(),
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/delete',
			[
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'destroyManyPermanent' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => $this->bulkActionArgs(),
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/trash',
			[
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'destroy' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => $this->idArg(),
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/delete',
			[
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'destroyPermanent' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => $this->idArg(),
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/duplicate',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'duplicate' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => $this->idArg(),
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/publish',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'publish' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => $this->idArg(),
			]
		);
	}

	/**
	 * GET /all-feedback/v1/surveys
	 *
	 * Return a paginated list of surveys.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response
	 * @since  1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response {
		$page    = max( 1, (int) ( $request->get_param( 'page' ) ?? 1 ) );
		$perPage = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?? 20 ) ) );
		$search  = sanitize_text_field( (string) ( $request->get_param( 'search' ) ?? '' ) );
		$status  = (string) ( $request->get_param( 'status' ) ?? 'any' );
		$orderby = sanitize_key( (string) ( $request->get_param( 'orderby' ) ?? 'created_at' ) );
		$order   = strtoupper( (string) ( $request->get_param( 'order' ) ?? 'DESC' ) );

		$filter = new SurveyFilter(
			status:  $status !== 'any' ? SurveyStatus::tryFrom( $status ) : null,
			page:    $page,
			perPage: $perPage,
			search:  $search !== '' ? $search : null,
			orderBy: $orderby,
			order:   $order,
		);

		$surveys = $this->surveyRepository->findAll( $filter );
		$total   = $this->surveyRepository->count( $filter );

		return $this->successResponse(
			[
				'surveys'  => array_map( [ $this, 'prepareSurvey' ], $surveys ),
				'total'    => $total,
				'page'     => $page,
				'per_page' => $perPage,
			]
		);
	}

	/**
	 * POST /all-feedback/v1/surveys
	 *
	 * Create a new survey.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function store( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$formSchema = $request->get_param( 'form_schema' );

		if ( $formSchema !== null ) {
			$schemaCheck = $this->validateFormSchema( $formSchema );
			if ( is_wp_error( $schemaCheck ) ) {
				return $schemaCheck;
			}
		}

		$settings = $request->get_param( 'settings' );
		if ( $settings !== null ) {
			$settingsCheck = $this->validateSettings( $settings );
			if ( is_wp_error( $settingsCheck ) ) {
				return $settingsCheck;
			}
			$settings = apply_filters( 'allfeedback_settings_before_save', $settings, $request );
		}

		$formSchemaArray = $formSchema !== null ? ( $this->normaliseJsonParam( $formSchema ) ?? [] ) : [];
		$settingsArray   = $settings !== null ? ( $this->normaliseJsonParam( $settings ) ?? [] ) : [];

		$survey = new Survey(
			title:       sanitize_text_field( (string) $request->get_param( 'title' ) ),
			description: wp_kses_post( (string) ( $request->get_param( 'description' ) ?? '' ) ),
			formSchema:  $formSchemaArray,
			settings:    $settingsArray,
			createdBy:   get_current_user_id() ?: 0,
		);

		try {
			$survey = $this->surveyRepository->save( $survey );
		} catch ( \RuntimeException $e ) {
			$this->logger->error( 'Survey creation failed at DB layer.', [ 'user_id' => get_current_user_id(), 'error' => $e->getMessage() ] );
			return $this->errorResponse( __( 'Failed to create survey.', 'all-feedback' ), 500 );
		}

		$schemaStats = $this->schemaStats( $formSchemaArray );

		$this->logger->info(
			'Survey created.',
			array_merge(
				[
					'survey_id'  => $survey->getId(),
					'title'      => $survey->getTitle(),
					'has_schema' => $formSchemaArray !== [],
					'user_id'    => get_current_user_id(),
				],
				$schemaStats
			)
		);

		return $this->successResponse( $this->prepareSurvey( $survey ), 201 );
	}

	/**
	 * GET /all-feedback/v1/surveys/{id}
	 *
	 * Return a single survey including full form_schema, settings, and targeting.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function show( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$survey = $this->surveyRepository->findById( (int) $request->get_param( 'id' ) );

		if ( $survey === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		if ( ! current_user_can( 'manage_options' ) && ! $survey->getStatus()->isPublished() ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		return $this->successResponse( $this->prepareSurvey( $survey ) );
	}

	/**
	 * PUT /all-feedback/v1/surveys/{id}
	 *
	 * Apply a full or partial update to an existing survey.
	 * Called by the builder autosave on every change.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function update( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$body = $request->get_json_params() ?? [];

		$survey = $this->surveyRepository->findById( $id );
		if ( $survey === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		$previousStatus = $survey->getStatus();
		$changed        = false;

		if ( array_key_exists( 'title', $body ) ) {
			$survey->setTitle( sanitize_text_field( (string) $request->get_param( 'title' ) ) );
			$changed = true;
		}

		if ( array_key_exists( 'description', $body ) ) {
			$survey->setDescription( wp_kses_post( (string) $request->get_param( 'description' ) ) );
			$changed = true;
		}

		if ( array_key_exists( 'form_schema', $body ) ) {
			$formSchema  = $request->get_param( 'form_schema' );
			$schemaCheck = $this->validateFormSchema( $formSchema );
			if ( is_wp_error( $schemaCheck ) ) {
				return $schemaCheck;
			}
			$survey->setFormSchema( $this->normaliseJsonParam( $formSchema ) ?? [] );
			$changed = true;
		}

		if ( array_key_exists( 'settings', $body ) ) {
			$settingsRaw   = $request->get_param( 'settings' );
			$settingsCheck = $this->validateSettings( $settingsRaw );
			if ( is_wp_error( $settingsCheck ) ) {
				return $settingsCheck;
			}
			/** This filter is documented in store(). */
			$settingsRaw = apply_filters( 'allfeedback_settings_before_save', $settingsRaw, $request );
			$survey->setSettings( $this->normaliseJsonParam( $settingsRaw ) ?? [] );
			$changed = true;
		}

		if ( array_key_exists( 'styling', $body ) ) {
			$stylingRaw   = $request->get_param( 'styling' );
			$stylingCheck = $this->validateStyling( $stylingRaw );
			if ( is_wp_error( $stylingCheck ) ) {
				return $stylingCheck;
			}
			$survey->setStyling( $this->normaliseJsonParam( $stylingRaw ) ?? [] );
			$changed = true;
		}

		$transitioningToPublished = false;
		$transitioningToDraft     = false;

		if ( array_key_exists( 'status', $body ) ) {
			$statusStr = sanitize_key( (string) $request->get_param( 'status' ) );
			$status    = SurveyStatus::tryFrom( $statusStr );
			if ( $status === null ) {
				return $this->errorResponse(
					sprintf(
						/* translators: %s: Comma-separated list of valid statuses */
						__( 'Invalid status. Allowed values: %s.', 'all-feedback' ),
						implode( ', ', array_column( SurveyStatus::cases(), 'value' ) )
					),
					422
				);
			}
			$transitioningToPublished = ( $status === SurveyStatus::Published );
			$transitioningToDraft     = ( $status === SurveyStatus::Draft && $survey->getStatus() === SurveyStatus::Published );
			match ( $status ) {
				SurveyStatus::Published => $survey->publish(),
				SurveyStatus::Archived  => $survey->archive(),
				SurveyStatus::Trashed   => $survey->trash(),
				SurveyStatus::Draft     => $survey->restore(),
			};
			$changed = true;
		}

		if ( ! $changed ) {
			return $this->successResponse( $this->prepareSurvey( $survey ) );
		}

		if ( $transitioningToPublished || $transitioningToDraft ) {
			$conflicts = $this->detectPublishingConflicts( $survey );
			if ( ! empty( $conflicts ) ) {
				if ( $transitioningToPublished ) {
					$survey->restore();
				}
				$conflictTitles = implode( ', ', array_map(
					static fn( array $c ) => '"' . $c['title'] . '"',
					$conflicts
				) );
				$survey->setConflictReason(
					sprintf(
						/* translators: %s: comma-separated conflicting form titles */
						__( 'Saved as draft — same pages already targeted by %s.', 'all-feedback' ),
						$conflictTitles
					)
				);
			} else {
				$survey->setConflictReason( null );
			}
		}

		try {
			$survey = $this->surveyRepository->save( $survey );
		} catch ( \RuntimeException $e ) {
			$this->logger->error( 'Survey update failed at DB layer.', [ 'survey_id' => $id, 'user_id' => get_current_user_id(), 'error' => $e->getMessage() ] );
			return $this->errorResponse( __( 'Failed to update survey.', 'all-feedback' ), 500 );
		}

		$logContext = [
			'survey_id'    => $id,
			'changed_keys' => array_keys( $body ),
			'user_id'      => get_current_user_id(),
		];

		if ( array_key_exists( 'form_schema', $body ) ) {
			$logContext = array_merge( $logContext, $this->schemaStats( $survey->getFormSchema() ) );
		}

		$this->logger->info( 'Survey updated.', $logContext );

		do_action( 'allfeedback:survey:updated', $survey );

		if ( $transitioningToPublished && $survey->getStatus()->isPublished() && ! $previousStatus->isPublished() ) {
			do_action( 'allfeedback:survey:activated', $survey );
		}

		return $this->successResponse( $this->prepareSurvey( $survey ) );
	}

	/**
	 * DELETE /all-feedback/v1/surveys/{id}/trash
	 *
	 * Move a survey to the trash (sets status to 'trashed').
	 * To permanently remove a trashed survey use DELETE /surveys/{id}/delete.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function destroy( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id     = (int) $request->get_param( 'id' );
		$survey = $this->surveyRepository->findById( $id );

		if ( $survey === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		if ( $survey->getStatus()->isTrashed() ) {
			return $this->errorResponse(
				__( 'Survey is already in the trash. Use DELETE /surveys/{id}/delete to remove it permanently.', 'all-feedback' ),
				409
			);
		}

		$survey->trash();

		try {
			$this->surveyRepository->save( $survey );
		} catch ( \RuntimeException $e ) {
			$this->logger->error( 'Survey trash failed at DB layer.', [ 'survey_id' => $id, 'user_id' => get_current_user_id(), 'error' => $e->getMessage() ] );
			return $this->errorResponse( __( 'Failed to move survey to trash.', 'all-feedback' ), 500 );
		}

		$this->logger->info(
			'Survey moved to trash.',
			[ 'survey_id' => $id, 'title' => $survey->getTitle(), 'user_id' => get_current_user_id() ]
		);

		return $this->successResponse( [ 'trashed' => true, 'id' => $id ] );
	}

	/**
	 * DELETE /all-feedback/v1/surveys/{id}/delete
	 *
	 * Permanently remove a trashed survey from the database.
	 * The survey must have status 'trashed' — use DELETE /surveys/{id}/trash first.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function destroyPermanent( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id     = (int) $request->get_param( 'id' );
		$survey = $this->surveyRepository->findById( $id );

		if ( $survey === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		if ( ! $survey->getStatus()->isTrashed() ) {
			return $this->errorResponse(
				__( 'Only trashed surveys can be permanently deleted. Use DELETE /surveys/{id}/trash first.', 'all-feedback' ),
				409
			);
		}

		if ( ! $this->surveyRepository->delete( $id ) ) {
			$this->logger->error( 'Permanent survey deletion failed at DB layer.', [ 'survey_id' => $id, 'user_id' => get_current_user_id() ] );
			return $this->errorResponse( __( 'Failed to permanently delete survey.', 'all-feedback' ), 500 );
		}

		$this->responseRepository->deleteBySurveyId( $id );

		$this->logger->info(
			'Survey permanently deleted.',
			[ 'survey_id' => $id, 'title' => $survey->getTitle(), 'user_id' => get_current_user_id() ]
		);

		return $this->successResponse( [ 'deleted' => true, 'id' => $id ] );
	}

	/**
	 * POST /all-feedback/v1/surveys/{id}/duplicate
	 *
	 * Create a copy of a survey with status reset to draft.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function duplicate( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id       = (int) $request->get_param( 'id' );
		$original = $this->surveyRepository->findById( $id );

		if ( $original === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		$copy = new Survey(
			title:       $original->getTitle() . ' ' . __( '(Copy)', 'all-feedback' ),
			description: $original->getDescription(),
			formSchema:  $original->getFormSchema(),
			settings:    $original->getSettings(),
			createdBy:   get_current_user_id() ?: 0,
		);

		try {
			$copy = $this->surveyRepository->save( $copy );
		} catch ( \RuntimeException $e ) {
			$this->logger->error( 'Survey duplication failed at DB layer.', [ 'source_id' => $id, 'user_id' => get_current_user_id(), 'error' => $e->getMessage() ] );
			return $this->errorResponse( __( 'Failed to duplicate survey.', 'all-feedback' ), 500 );
		}

		return $this->successResponse( $this->prepareSurvey( $copy ), 201 );
	}

	/**
	 * POST /all-feedback/v1/surveys/{id}/publish
	 *
	 * Transition a survey to published status.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function publish( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		return $this->transitionStatus( (int) $request->get_param( 'id' ), SurveyStatus::Published );
	}

	/**
	 * DELETE /all-feedback/v1/surveys/trash
	 *
	 * Bulk-trash multiple surveys by ID.
	 * Surveys that are already trashed are skipped (not counted as failures).
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function destroyMany( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$ids = array_values( array_filter( array_map( 'absint', (array) ( $request->get_param( 'ids' ) ?? [] ) ) ) );

		if ( empty( $ids ) ) {
			return $this->errorResponse( __( 'No survey IDs provided.', 'all-feedback' ), 422 );
		}

		$trashed = 0;
		$skipped = [];
		$failed  = [];

		foreach ( $ids as $id ) {
			$survey = $this->surveyRepository->findById( $id );

			if ( $survey === null ) {
				$failed[] = $id;
				continue;
			}

			if ( $survey->getStatus()->isTrashed() ) {
				$skipped[] = $id;
				continue;
			}

			$survey->trash();

			try {
				$this->surveyRepository->save( $survey );
				++$trashed;
			} catch ( \RuntimeException ) {
				$failed[] = $id;
			}
		}

		$this->logger->info(
			'Bulk survey trash completed.',
			[
				'requested'     => $ids,
				'trashed_count' => $trashed,
				'skipped'       => $skipped,
				'failed'        => $failed,
				'user_id'       => get_current_user_id(),
			]
		);

		return $this->successResponse(
			[
				'trashed' => $trashed,
				'skipped' => $skipped,
				'failed'  => $failed,
			]
		);
	}

	/**
	 * DELETE /all-feedback/v1/surveys/delete
	 *
	 * Bulk permanently delete multiple surveys by ID.
	 * Only surveys with status 'trashed' are deleted — others are skipped.
	 * Use DELETE /surveys/trash first to move surveys to the trash.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function destroyManyPermanent( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$ids = array_values( array_filter( array_map( 'absint', (array) ( $request->get_param( 'ids' ) ?? [] ) ) ) );

		if ( empty( $ids ) ) {
			return $this->errorResponse( __( 'No survey IDs provided.', 'all-feedback' ), 422 );
		}

		$deleted = 0;
		$skipped = [];
		$failed  = [];

		foreach ( $ids as $id ) {
			$survey = $this->surveyRepository->findById( $id );

			if ( $survey === null ) {
				$failed[] = $id;
				continue;
			}

			if ( ! $survey->getStatus()->isTrashed() ) {
				$skipped[] = $id;
				continue;
			}

			if ( $this->surveyRepository->delete( $id ) ) {
				++$deleted;
				$this->responseRepository->deleteBySurveyId( $id );
			} else {
				$failed[] = $id;
			}
		}

		$this->logger->info(
			'Bulk survey permanent deletion completed.',
			[
				'requested'     => $ids,
				'deleted_count' => $deleted,
				'skipped'       => $skipped,
				'failed'        => $failed,
				'user_id'       => get_current_user_id(),
			]
		);

		return $this->successResponse(
			[
				'deleted' => $deleted,
				'skipped' => $skipped,
				'failed'  => $failed,
			]
		);
	}

	/**
	 * JSON schema for a single survey item.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	public function getPublicItemSchema(): array {
		$statusValues = array_column( SurveyStatus::cases(), 'value' );

		return [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'allfeedback_survey',
			'type'       => 'object',
			'properties' => [
				'id'             => [
					'description' => __( 'Unique identifier.', 'all-feedback' ),
					'type'        => 'integer',
					'context'     => [ 'view', 'edit' ],
					'readonly'    => true,
				],
				'title'          => [
					'description' => __( 'Survey title shown in the forms list.', 'all-feedback' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit' ],
				],
				'description'    => [
					'description' => __( 'Optional survey description (HTML allowed).', 'all-feedback' ),
					'type'        => [ 'string', 'null' ],
					'context'     => [ 'view', 'edit' ],
				],
				'form_schema'    => [
					'description' => __( 'Full builder structure: sections, fields, conditional logic.', 'all-feedback' ),
					'type'        => [ 'object', 'null' ],
					'context'     => [ 'view', 'edit' ],
				],
				'settings'       => [
					'description' => __( 'Per-survey configuration: submit labels, user targeting, trigger, display frequency.', 'all-feedback' ),
					'type'        => [ 'object', 'null' ],
					'context'     => [ 'view', 'edit' ],
				],
				'status'         => [
					'description' => __( 'Survey lifecycle status.', 'all-feedback' ),
					'type'        => 'string',
					'enum'        => $statusValues,
					'context'     => [ 'view', 'edit' ],
				],
				'response_count' => [
					'description' => __( 'Cached count of responses received.', 'all-feedback' ),
					'type'        => 'integer',
					'minimum'     => 0,
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'created_by'     => [
					'description' => __( 'WordPress user ID of the creator.', 'all-feedback' ),
					'type'        => [ 'integer', 'null' ],
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'created_at'     => [
					'description' => __( 'Creation date (MySQL datetime).', 'all-feedback' ),
					'type'        => 'string',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'updated_at'     => [
					'description' => __( 'Last update date (MySQL datetime).', 'all-feedback' ),
					'type'        => [ 'string', 'null' ],
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
			],
		];
	}

	/**
	 * Query-string arguments for GET /surveys.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function collectionArgs(): array {
		$statusValues = array_column( SurveyStatus::cases(), 'value' );

		return array_merge(
			$this->paginationArgs( defaultPerPage: 20, maxPerPage: 100 ),
			[
				'search'  => $this->argString(
					description: __( 'Filter surveys by title keyword.', 'all-feedback' ),
				),
				'status'  => $this->argEnum(
					description: __( 'Filter by survey status.', 'all-feedback' ),
					values:      array_merge( $statusValues, [ 'any' ] ),
					default:     'any',
				),
				'orderby' => $this->argEnum(
					description: __( 'Column to sort results by.', 'all-feedback' ),
					values:      [ 'id', 'title', 'status', 'response_count', 'created_at', 'updated_at' ],
					default:     'created_at',
				),
				'order'   => $this->argEnum(
					description: __( 'Sort direction.', 'all-feedback' ),
					values:      [ 'ASC', 'DESC' ],
					default:     'DESC',
				),
			]
		);
	}

	/**
	 * Body arguments for POST (create) and PUT (update).
	 *
	 * @param  bool $required Whether title is required (true for create, false for update).
	 * @return array<string, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function writeArgs( bool $required ): array {
		$statusValues = array_column( SurveyStatus::cases(), 'value' );

		return [
			'title'       => $this->argString(
				description: __( 'Survey title.', 'all-feedback' ),
				required:    $required,
				minLength:   1,
				maxLength:   255,
			),
			'description' => $this->argString(
				description: __( 'Optional survey description (HTML allowed).', 'all-feedback' ),
				sanitize:    'wp_kses_post',
				default:     '',
			),
			'form_schema' => [
				'description' => __( 'Builder structure: version string, sections array with fields.', 'all-feedback' ),
				'type'        => [ 'object', 'array', 'string', 'null' ],
			],
			'settings'    => [
				'description' => __( 'Per-survey configuration object (trigger, frequency, targeting, submit labels).', 'all-feedback' ),
				'type'        => [ 'object', 'array', 'string', 'null' ],
			],
			'styling'     => [
				'description' => __( 'Per-survey visual appearance overrides (widget icon, label, position).', 'all-feedback' ),
				'type'        => [ 'object', 'array', 'string', 'null' ],
			],
			'status'      => $this->argEnum(
				description: __( 'Survey lifecycle status.', 'all-feedback' ),
				values:      $statusValues,
				default:     'draft',
			),
		];
	}

	/**
	 * Body arguments shared by bulk trash and bulk permanent delete endpoints.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function bulkActionArgs(): array {
		return [
			'ids' => [
				'description' => __( 'Array of survey IDs to operate on.', 'all-feedback' ),
				'type'        => 'array',
				'required'    => true,
				'items'       => [
					'type'    => 'integer',
					'minimum' => 1,
				],
				'minItems'    => 1,
			],
		];
	}

	/**
	 * Serialise a Survey aggregate into the REST response shape.
	 *
	 * @param  Survey $survey Survey aggregate root.
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	private function prepareSurvey( Survey $survey ): array {
		$formSchema = $survey->getFormSchema();
		$settings   = $survey->getSettings();

		$styling = $survey->getStyling();

		$prepared = [
			'id'              => $survey->getId(),
			'title'           => $survey->getTitle(),
			'description'     => $survey->getDescription(),
			'form_schema'     => $formSchema !== [] ? $formSchema : null,
			'settings'        => $settings !== [] ? $settings : null,
			'styling'         => $styling !== [] ? $styling : null,
			'status'          => $survey->getStatus()->value,
			'conflict_reason' => $survey->getConflictReason(),
			'response_count'  => $survey->getResponseCount(),
			'created_by'      => $survey->getCreatedBy() ?: null,
			'created_at'      => $survey->getCreatedAt()->format( 'Y-m-d H:i:s' ),
			'updated_at'      => $survey->getUpdatedAt()?->format( 'Y-m-d H:i:s' ),
		];

		return apply_filters( 'allfeedback_prepare_survey', $prepared, $survey );
	}

	/**
	 * Retrieve a survey, change its status, persist, and return the updated representation.
	 *
	 * @param  int          $id     Survey primary key.
	 * @param  SurveyStatus $status Target status.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	private function transitionStatus( int $id, SurveyStatus $status ): \WP_REST_Response|\WP_Error {
		$survey = $this->surveyRepository->findById( $id );

		if ( $survey === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		$previousStatus = $survey->getStatus();

		match ( $status ) {
			SurveyStatus::Published => $survey->publish(),
			SurveyStatus::Archived  => $survey->archive(),
			SurveyStatus::Trashed   => $survey->trash(),
			SurveyStatus::Draft     => $survey->restore(),
		};

		if ( $status === SurveyStatus::Published ) {
			$conflicts = $this->detectPublishingConflicts( $survey );
			if ( ! empty( $conflicts ) ) {
				$survey->restore();
				$conflictTitles = implode( ', ', array_map(
					static fn( array $c ) => '"' . $c['title'] . '"',
					$conflicts
				) );
				$survey->setConflictReason(
					sprintf(
						/* translators: %s: comma-separated conflicting form titles */
						\__( 'Saved as draft — same pages already targeted by %s.', 'all-feedback' ),
						$conflictTitles
					)
				);
			} else {
				$survey->setConflictReason( null );
			}
		}

		try {
			$survey = $this->surveyRepository->save( $survey );
		} catch ( \RuntimeException $e ) {
			$this->logger->error(
				'Survey status transition failed at DB layer.',
				[ 'survey_id' => $id, 'target_status' => $status->value, 'user_id' => get_current_user_id(), 'error' => $e->getMessage() ]
			);
			return $this->errorResponse(
				sprintf(
					/* translators: %s: Target status */
					__( 'Failed to set survey status to %s.', 'all-feedback' ),
					$status->value
				),
				500
			);
		}

		$formSchema   = $survey->getFormSchema();
		$hasSchema    = $formSchema !== [];
		$actualStatus = $survey->getStatus();

		if ( $status === SurveyStatus::Published && ! $hasSchema && $survey->getConflictReason() === null ) {
			$this->logger->warning(
				'Survey published without a form schema.',
				[ 'survey_id' => $id, 'title' => $survey->getTitle(), 'user_id' => get_current_user_id() ]
			);
		}

		$this->logger->info(
			"Survey status changed to {$actualStatus->value}.",
			array_merge(
				[
					'survey_id'       => $id,
					'title'           => $survey->getTitle(),
					'previous_status' => $previousStatus->value,
					'new_status'      => $actualStatus->value,
					'has_schema'      => $hasSchema,
					'user_id'         => get_current_user_id(),
				],
				$this->schemaStats( $formSchema )
			)
		);

		do_action( 'allfeedback:survey:updated', $survey );

		if ( $survey->getStatus()->isPublished() && ! $previousStatus->isPublished() ) {
			do_action( 'allfeedback:survey:activated', $survey );
		}

		return $this->successResponse( $this->prepareSurvey( $survey ) );
	}

	/**
	 * Detect published surveys whose targeting overlaps with $published.
	 *
	 * Returns an array of conflict descriptors (id, title, targeting_scope).
	 *
	 * @param  Survey $published The survey being published.
	 * @return array<int, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function detectPublishingConflicts( Survey $published ): array {
		try {
			$others = $this->surveyRepository->findAll(
				new SurveyFilter( status: SurveyStatus::Published, perPage: 200 )
			);
		} catch ( \Throwable ) {
			return [];
		}

		$publishedId      = $published->getId();
		$publishedScope   = $this->targetingScope( $published );
		$publishedPageIds = $this->targetingPageIds( $published );

		$conflicts = [];

		foreach ( $others as $other ) {
			if ( $other->getId() === $publishedId ) {
				continue;
			}

			$otherScope   = $this->targetingScope( $other );
			$otherPageIds = $this->targetingPageIds( $other );

			$overlaps = false;

			if ( $publishedScope === 'all_pages' || $otherScope === 'all_pages' ) {
				$overlaps = true;
			} elseif ( ! empty( array_intersect( $publishedPageIds, $otherPageIds ) ) ) {
				$overlaps = true;
			}

			if ( $overlaps ) {
				$conflicts[] = [
					'id'              => $other->getId(),
					'title'           => $other->getTitle(),
					'targeting_scope' => $otherScope,
				];
			}
		}

		return $conflicts;
	}

	/**
	 * Return a human-readable targeting scope string for a survey.
	 *
	 * @param  Survey $survey Survey aggregate to inspect.
	 * @return string Either 'all_pages' or 'specific_pages'.
	 * @since  1.0.0
	 */
	private function targetingScope( Survey $survey ): string {
		$settings  = $survey->getSettings();
		$targeting = (array) ( $settings['targeting'] ?? [] );

		if ( ! empty( $targeting ) ) {
			$mode = (string) ( $targeting['mode'] ?? 'all' );
			return $mode === 'all' ? 'all_pages' : 'specific_pages';
		}

		$targetPages = (string) ( $settings['targetPages'] ?? $settings['target_pages'] ?? 'all' );
		return $targetPages === 'all' ? 'all_pages' : 'specific_pages';
	}

	/**
	 * Return the page/post IDs a survey explicitly targets (empty = all pages).
	 *
	 * @param  Survey $survey Survey aggregate to inspect.
	 * @return int[]
	 * @since  1.0.0
	 */
	private function targetingPageIds( Survey $survey ): array {
		$settings  = $survey->getSettings();
		$targeting = (array) ( $settings['targeting'] ?? [] );

		if ( ! empty( $targeting ) ) {
			if ( ( $targeting['mode'] ?? 'all' ) === 'all' ) {
				return [];
			}
			$ids = [];
			foreach ( (array) ( $targeting['rules'] ?? [] ) as $rule ) {
				if ( isset( $rule['value'] ) && in_array( $rule['type'] ?? '', [ 'page_id', 'post_id' ], true ) ) {
					$ids[] = (int) $rule['value'];
				}
			}
			return $ids;
		}

		$targetPages = (string) ( $settings['targetPages'] ?? $settings['target_pages'] ?? 'all' );
		if ( $targetPages === 'all' ) {
			return [];
		}

		return array_values( array_filter(
			array_map( 'intval', (array) ( $settings['target_page_ids'] ?? [] ) ),
			fn( int $id ) => $id > 0
		) );
	}

	/**
	 * Validate that form_schema contains valid JSON with allowed field types.
	 *
	 * Accepts arrays (WP JSON body parsing), stdClass objects, or pre-encoded
	 * JSON strings — all three are normalised to an array before validation.
	 *
	 * @param  mixed $schema Raw value from the request.
	 * @return true|\WP_Error
	 * @since  1.0.0
	 */
	private function validateFormSchema( mixed $schema ): true|\WP_Error {
		if ( $schema === null || $schema === '' ) {
			return true;
		}

		$schema = $this->normaliseJsonParam( $schema );

		if ( $schema === null ) {
			return $this->errorResponse( __( 'form_schema must be a valid JSON object.', 'all-feedback' ), 422 );
		}

		if ( ! isset( $schema['sections'] ) || ! is_array( $schema['sections'] ) ) {
			return true;
		}

		foreach ( $schema['sections'] as $section ) {
			$section = (array) $section;

			if ( empty( $section['fields'] ) || ! is_array( $section['fields'] ) ) {
				continue;
			}

			foreach ( $section['fields'] as $field ) {
				$field = (array) $field;

				if ( isset( $field['type'] ) && ! in_array( $field['type'], self::FIELD_TYPES, true ) ) {
					return $this->errorResponse(
						sprintf(
							/* translators: %s: Invalid field type value */
							__( 'Invalid field type "%s".', 'all-feedback' ),
							sanitize_key( (string) $field['type'] )
						),
						422
					);
				}
			}
		}

		return true;
	}

	/**
	 * Validate the settings object against the canonical settings contract.
	 *
	 * All keys are optional — only present keys are validated.
	 * Unknown keys pass through unmodified (forward-compatibility for pro add-ons).
	 * Each enum list is filterable so pro features can register new valid values.
	 *
	 * @param  mixed $settings Raw settings value from the request.
	 * @return true|\WP_Error
	 * @since  1.0.0
	 */
	private function validateSettings( mixed $settings ): true|\WP_Error {
		if ( $settings === null || $settings === '' ) {
			return true;
		}

		$settings = $this->normaliseJsonParam( $settings );

		if ( $settings === null ) {
			return $this->errorResponse( __( 'settings must be a valid JSON object.', 'all-feedback' ), 422 );
		}

		/**
		 * Each entry: settings key => filterable list of allowed string values.
		 * Pro add-ons filter the individual lists to register new allowed values
		 * (e.g. add "exit_intent" to trigger types without touching core code).
		 *
		 * @var array<string, string[]>
		 */
		$enumRules = [
			'trigger_type'      => apply_filters(
				'allfeedback_settings_allowed_trigger_types',
				[ 'immediate', 'time_delay', 'scroll_depth' ]
			),
			'delay_unit'        => apply_filters(
				'allfeedback_settings_allowed_delay_units',
				[ 'seconds', 'minutes', 'hours' ]
			),
			'display_frequency' => apply_filters(
				'allfeedback_settings_allowed_display_frequencies',
				[ 'once', 'until_submit' ]
			),
			'dismiss_wait_unit' => apply_filters(
				'allfeedback_settings_allowed_dismiss_units',
				[ 'hours', 'days', 'weeks' ]
			),
			'user_state'        => apply_filters(
				'allfeedback_settings_allowed_user_states',
				[ 'all', 'logged_in', 'logged_out' ]
			),
			'target_pages'      => apply_filters(
				'allfeedback_settings_allowed_target_pages',
				[ 'all', 'specific' ]
			),
		];

		foreach ( $enumRules as $key => $allowed ) {
			if ( ! array_key_exists( $key, $settings ) ) {
				continue;
			}
			if ( ! in_array( $settings[ $key ], $allowed, true ) ) {
				return $this->errorResponse(
					sprintf(
						/* translators: 1: settings key name  2: submitted value  3: comma-separated allowed values */
						__( 'Invalid settings.%1$s "%2$s". Allowed: %3$s.', 'all-feedback' ),
						$key,
						sanitize_key( (string) $settings[ $key ] ),
						implode( ', ', $allowed )
					),
					422
				);
			}
		}

		foreach ( [ 'delay_value', 'scroll_depth', 'max_impressions', 'dismiss_wait_value' ] as $key ) {
			if ( ! array_key_exists( $key, $settings ) ) {
				continue;
			}
			if ( filter_var( $settings[ $key ], FILTER_VALIDATE_INT ) === false || (int) $settings[ $key ] < 0 ) {
				return $this->errorResponse(
					sprintf(
						/* translators: %s: settings key name */
						__( 'settings.%s must be a non-negative integer.', 'all-feedback' ),
						$key
					),
					422
				);
			}
		}

		if ( array_key_exists( 'target_page_ids', $settings ) ) {
			if ( ! is_array( $settings['target_page_ids'] ) ) {
				return $this->errorResponse(
					__( 'settings.target_page_ids must be an array.', 'all-feedback' ),
					422
				);
			}
			foreach ( $settings['target_page_ids'] as $pid ) {
				if ( filter_var( $pid, FILTER_VALIDATE_INT ) === false || (int) $pid < 1 ) {
					return $this->errorResponse(
						__( 'settings.target_page_ids must contain only positive integers.', 'all-feedback' ),
						422
					);
				}
			}
		}

		return true;
	}

	/**
	 * Validate the styling parameter before persisting it.
	 *
	 * Allowed keys and their constraints:
	 *   widget_position — enum: bottom-right, bottom-left, side-tab, or empty string
	 *   widget_icon     — string (arbitrary icon identifier), max 64 chars
	 *   widget_label    — string (launcher button text), max 80 chars
	 *   widget_color    — string (CSS colour value), max 30 chars
	 *
	 * @param  mixed $styling Raw styling value from the request.
	 * @return true|\WP_Error
	 * @since  1.0.0
	 */
	private function validateStyling( mixed $styling ): true|\WP_Error {
		if ( $styling === null || $styling === '' ) {
			return true;
		}

		$styling = $this->normaliseJsonParam( $styling );

		if ( $styling === null ) {
			return $this->errorResponse( __( 'styling must be a valid JSON object.', 'all-feedback' ), 422 );
		}

		$allowedPositions = apply_filters(
			'allfeedback_styling_allowed_widget_positions',
			[ '', 'bottom-right', 'bottom-left', 'side-tab' ]
		);

		if ( array_key_exists( 'widget_position', $styling ) ) {
			if ( ! in_array( $styling['widget_position'], $allowedPositions, true ) ) {
				return $this->errorResponse(
					sprintf(
						/* translators: %s: submitted value */
						__( 'Invalid styling.widget_position "%s". Allowed: bottom-right, bottom-left, side-tab, or empty string.', 'all-feedback' ),
						sanitize_text_field( (string) $styling['widget_position'] )
					),
					422
				);
			}
		}

		$allowedProgressIndicators = apply_filters(
			'allfeedback_styling_allowed_progress_indicators',
			[ 'dots', 'numbers', 'bar', 'none' ]
		);

		if ( array_key_exists( 'progress_indicator', $styling ) ) {
			if ( ! in_array( $styling['progress_indicator'], $allowedProgressIndicators, true ) ) {
				return $this->errorResponse(
					sprintf(
						/* translators: %s: submitted value */
						\__( 'Invalid styling.progress_indicator "%s". Allowed: dots, numbers, bar, none.', 'all-feedback' ),
						sanitize_key( (string) $styling['progress_indicator'] )
					),
					422
				);
			}
		}

		if ( array_key_exists( 'widget_icon', $styling ) && ! is_string( $styling['widget_icon'] ) ) {
			return $this->errorResponse(
				\__( 'styling.widget_icon must be a string.', 'all-feedback' ),
				422
			);
		}

		return true;
	}

	/**
	 * Extract section and field counts from a form_schema array.
	 *
	 * @param  array<string, mixed>|null $schema Decoded form_schema array.
	 * @return array{section_count: int, field_count: int}
	 * @since  1.0.0
	 */
	private function schemaStats( mixed $schema ): array {
		$stats = [ 'section_count' => 0, 'field_count' => 0 ];

		if ( $schema === null || $schema === '' || $schema === [] ) {
			return $stats;
		}

		$decoded = is_array( $schema ) ? $schema : ( is_string( $schema ) ? json_decode( $schema, true ) : null );

		if ( ! is_array( $decoded ) || empty( $decoded['sections'] ) || ! is_array( $decoded['sections'] ) ) {
			return $stats;
		}

		$stats['section_count'] = count( $decoded['sections'] );

		foreach ( $decoded['sections'] as $section ) {
			$section = (array) $section;
			if ( ! empty( $section['fields'] ) && is_array( $section['fields'] ) ) {
				$stats['field_count'] += count( $section['fields'] );
			}
		}

		return $stats;
	}

	/**
	 * Normalise a JSON parameter to an associative array regardless of how
	 * the REST client delivered it.
	 *
	 * WordPress decodes application/json bodies with json_decode (assoc=false),
	 * so objects arrive as stdClass. Some clients send pre-encoded JSON strings.
	 * This method handles all three forms and returns a plain array, or null on failure.
	 *
	 * @param  mixed $value Raw parameter value.
	 * @return array<string, mixed>|null
	 * @since  1.0.0
	 */
	private function normaliseJsonParam( mixed $value ): ?array {
		if ( is_array( $value ) ) {
			return $value;
		}

		if ( is_object( $value ) ) {
			return (array) $value;
		}

		if ( is_string( $value ) ) {
			$decoded = json_decode( $value, true );
			return is_array( $decoded ) ? $decoded : null;
		}

		return null;
	}
}
