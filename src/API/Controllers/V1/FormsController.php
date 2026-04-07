<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Application\Form\CreateFormService;
use AllFeedback\Application\Form\FormDTO;
use AllFeedback\Application\Form\UpdateFormService;
use AllFeedback\Domain\Form\Form;
use AllFeedback\Domain\Form\FormField;
use AllFeedback\Domain\Form\FormFieldType;
use AllFeedback\Domain\Form\FormRepository;

/**
 * Class FormsController
 *
 * REST controller for the /forms resource.
 *
 * Routes registered:
 *   GET    /all-feedback/v1/forms            → index()    : paginated list of forms
 *   POST   /all-feedback/v1/forms            → store()    : create a new form
 *   GET    /all-feedback/v1/forms/{id}       → show()     : retrieve a single form
 *   POST   /all-feedback/v1/forms/{id}       → update()   : update an existing form
 *   DELETE /all-feedback/v1/forms/{id}       → destroy()  : delete a form
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class FormsController extends RestController {

	/**
	 * @since 1.0.0
	 */
	protected string $restBase = 'forms';

	/**
	 * @param FormRepository    $repository    Persistence port for Form aggregates.
	 * @param CreateFormService $createService Application service for form creation.
	 * @param UpdateFormService $updateService Application service for form updates.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly FormRepository $repository,
		private readonly CreateFormService $createService,
		private readonly UpdateFormService $updateService,
	) {}

	/**
	 * Register all routes for this controller.
	 *
	 * @since 1.0.0
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
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => $this->idArg(),
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge( $this->idArg(), $this->writeArgs( required: false ) ),
				],
				[
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'destroy' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => $this->idArg(),
				],
				'schema' => [ $this, 'getPublicItemSchema' ],
			]
		);
	}

	// ------------------------------------------------------------------
	// Route handlers
	// ------------------------------------------------------------------

	/**
	 * GET /all-feedback/v1/forms
	 *
	 * Return a paginated collection of forms.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response
	 * @since 1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response {
		$page     = max( 1, (int) ( $request->get_param( 'page' ) ?? 1 ) );
		$perPage  = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?? 20 ) ) );
		$offset   = ( $page - 1 ) * $perPage;
		$search   = sanitize_text_field( (string) ( $request->get_param( 'search' ) ?? '' ) );
		$isActive = $request->get_param( 'status' ) !== null
			? ( $request->get_param( 'status' ) === 'active' )
			: null;

		$forms = $this->repository->findAll( $perPage, $offset, $search !== '' ? $search : null, $isActive );
		$total = $this->repository->count( $search !== '' ? $search : null, $isActive );

		return $this->successResponse(
			[
				'forms'    => array_map( [ $this, 'prepareForm' ], $forms ),
				'total'    => $total,
				'page'     => $page,
				'per_page' => $perPage,
			]
		);
	}

	/**
	 * POST /all-feedback/v1/forms
	 *
	 * Create a new form. Body parameters are validated by writeArgs().
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function store( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		try {
			$dto  = FormDTO::fromArray( $request->get_params() );
			$form = $this->createService->execute( $dto );
			return $this->successResponse( $this->prepareForm( $form ), 201 );
		} catch ( \Throwable $e ) {
			return $this->exceptionToResponse( $e );
		}
	}

	/**
	 * GET /all-feedback/v1/forms/{id}
	 *
	 * Return a single form by its primary key.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function show( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$form = $this->repository->findById( $id );

		if ( ! $form ) {
			return $this->notFoundResponse( __( 'Form', 'all-feedback' ) );
		}

		return $this->successResponse( $this->prepareForm( $form ) );
	}

	/**
	 * POST /all-feedback/v1/forms/{id}
	 *
	 * Apply a partial or full update to an existing form.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function update( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$body = $request->get_json_params() ?? [];

		try {
			$dto  = FormDTO::fromArray( $request->get_params() );
			$form = $this->updateService->execute( $id, $body, $dto );
			return $this->successResponse( $this->prepareForm( $form ) );
		} catch ( \Throwable $e ) {
			return $this->exceptionToResponse( $e );
		}
	}

	/**
	 * DELETE /all-feedback/v1/forms/{id}
	 *
	 * Permanently delete a form and all its associated data.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function destroy( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$form = $this->repository->findById( $id );

		if ( ! $form ) {
			return $this->notFoundResponse( __( 'Form', 'all-feedback' ) );
		}

		if ( ! $this->repository->delete( $id ) ) {
			return $this->errorResponse( __( 'Failed to delete the form.', 'all-feedback' ), 500 );
		}

		return $this->successResponse( [ 'deleted' => true, 'id' => $id ] );
	}

	// ------------------------------------------------------------------
	// Schema
	// ------------------------------------------------------------------

	/**
	 * Return the JSON schema for a single form item.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function getPublicItemSchema(): array {
		return [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'allfeedback_form',
			'type'       => 'object',
			'properties' => [
				'id'          => [
					'description' => __( 'Unique identifier.', 'all-feedback' ),
					'type'        => 'integer',
					'context'     => [ 'view', 'edit' ],
					'readonly'    => true,
				],
				'title'       => [
					'description' => __( 'Form title.', 'all-feedback' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit' ],
				],
				'description' => [
					'description' => __( 'Optional intro text shown above the form.', 'all-feedback' ),
					'type'        => 'string',
					'context'     => [ 'view', 'edit' ],
				],
				'is_active'   => [
					'description' => __( 'Whether the form is accepting new submissions.', 'all-feedback' ),
					'type'        => 'boolean',
					'context'     => [ 'view', 'edit' ],
				],
				'fields'      => [
					'description' => __( 'Ordered list of form fields.', 'all-feedback' ),
					'type'        => 'array',
					'context'     => [ 'view', 'edit' ],
					'items'       => [
						'type'       => 'object',
						'properties' => [
							'id'          => [ 'type' => 'integer', 'readonly' => true ],
							'type'        => [ 'type' => 'string', 'enum' => FormFieldType::values() ],
							'label'       => [ 'type' => 'string' ],
							'sort_order'  => [ 'type' => 'integer', 'minimum' => 0 ],
							'required'    => [ 'type' => 'boolean' ],
							'placeholder' => [ 'type' => 'string' ],
							'choices'     => [
								'type'  => 'array',
								'items' => [ 'type' => 'string' ],
							],
							'settings'    => [ 'type' => 'object' ],
						],
					],
				],
				'created_at'  => [
					'description' => __( 'Creation date (ISO 8601).', 'all-feedback' ),
					'type'        => 'string',
					'format'      => 'date-time',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'updated_at'  => [
					'description' => __( 'Last update date (ISO 8601).', 'all-feedback' ),
					'type'        => [ 'string', 'null' ],
					'format'      => 'date-time',
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
	 * Query-string arguments for GET /forms.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	private function collectionArgs(): array {
		return array_merge(
			$this->paginationArgs( defaultPerPage: 20, maxPerPage: 100 ),
			[
				'search' => $this->argString(
					description: __( 'Filter forms by title keyword.', 'all-feedback' ),
				),
				'status' => $this->argEnum(
					description: __( 'Filter by form status: active, inactive, or any.', 'all-feedback' ),
					values:      [ 'active', 'inactive', 'any' ],
					default:     'any',
				),
			]
		);
	}

	/**
	 * Body arguments for create (required=true) and update (required=false).
	 *
	 * @param bool $required Whether title and type fields are required.
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	private function writeArgs( bool $required ): array {
		return [
			'title'       => $this->argString(
				description: __( 'Form title.', 'all-feedback' ),
				required:    $required,
				minLength:   1,
				maxLength:   200,
			),
			'description' => $this->argString(
				description: __( 'Optional intro text (HTML allowed).', 'all-feedback' ),
				sanitize:    'wp_kses_post',
				default:     '',
			),
			'is_active'   => $this->argBoolean(
				description: __( 'Whether the form accepts submissions.', 'all-feedback' ),
				default:     true,
			),
			'fields'      => [
				'description' => __( 'Ordered array of field objects to associate with the form.', 'all-feedback' ),
				'type'        => 'array',
				'items'       => [
					'type'                 => 'object',
					'additionalProperties' => true,
					'properties'           => [
						'type'        => [
							'type'     => 'string',
							'required' => $required,
							'enum'     => FormFieldType::values(),
						],
						'label'       => [
							'type'      => 'string',
							'required'  => $required,
							'minLength' => 1,
							'maxLength' => 500,
						],
						'sort_order'  => [ 'type' => 'integer', 'minimum' => 0 ],
						'required'    => [ 'type' => 'boolean' ],
						'placeholder' => [ 'type' => 'string', 'maxLength' => 300 ],
						'choices'     => [
							'type'  => 'array',
							'items' => [ 'type' => 'string', 'maxLength' => 200 ],
						],
						'settings'    => [ 'type' => 'object' ],
					],
				],
			],
		];
	}

	// ------------------------------------------------------------------
	// Serialisation
	// ------------------------------------------------------------------

	/**
	 * Serialise a Form aggregate into the REST response shape.
	 *
	 * @param Form $form The domain aggregate.
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	private function prepareForm( Form $form ): array {
		return [
			'id'          => $form->getId(),
			'title'       => $form->getTitle(),
			'description' => $form->getDescription(),
			'is_active'   => $form->isActive(),
			'fields'      => array_map( [ $this, 'prepareField' ], $form->getFields() ),
			'created_at'  => $form->getCreatedAt()->format( 'c' ),
			'updated_at'  => $form->getUpdatedAt()?->format( 'c' ),
		];
	}

	/**
	 * Serialise a FormField value object into the REST response shape.
	 *
	 * @param FormField $field The domain value object.
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	private function prepareField( FormField $field ): array {
		return [
			'id'          => $field->getId(),
			'type'        => $field->getType()->value,
			'label'       => $field->getLabel(),
			'sort_order'  => $field->getSortOrder(),
			'required'    => $field->isRequired(),
			'placeholder' => $field->getPlaceholder(),
			'choices'     => $field->getChoices(),
			'settings'    => $field->getSettings(),
		];
	}
}
