<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Application\Form\FormFieldDTO;
use AllFeedback\Domain\Form\FormField;
use AllFeedback\Domain\Form\FormFieldType;
use AllFeedback\Domain\Form\FormRepository;

/**
 * Class FormFieldsController
 *
 * REST controller for the /forms/{form_id}/fields resource.
 * Handles fine-grained management of individual fields within a form without
 * requiring a full form update.
 *
 * Routes registered:
 *   GET    /all-feedback/v1/forms/{form_id}/fields          → index()   : list all fields on a form
 *   POST   /all-feedback/v1/forms/{form_id}/fields          → store()   : append a new field
 *   GET    /all-feedback/v1/forms/{form_id}/fields/{id}     → show()    : retrieve a single field
 *   POST   /all-feedback/v1/forms/{form_id}/fields/{id}     → update()  : update an existing field
 *   DELETE /all-feedback/v1/forms/{form_id}/fields/{id}     → destroy() : remove a field
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class FormFieldsController extends RestController {

	/**
	 * @since 1.0.0
	 */
	protected string $restBase = 'forms/(?P<form_id>\d+)/fields';

	/**
	 * @param FormRepository $repository Persistence port for Form aggregates.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly FormRepository $repository,
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
					'args'                => $this->formIdArg(),
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'store' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge( $this->formIdArg(), $this->writeArgs( required: true ) ),
				],
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
					'args'                => array_merge( $this->formIdArg(), $this->idArg() ),
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge( $this->formIdArg(), $this->idArg(), $this->writeArgs( required: false ) ),
				],
				[
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'destroy' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge( $this->formIdArg(), $this->idArg() ),
				],
			]
		);
	}

	// ------------------------------------------------------------------
	// Route handlers
	// ------------------------------------------------------------------

	/**
	 * GET /all-feedback/v1/forms/{form_id}/fields
	 *
	 * Return all fields belonging to a form, sorted by sort_order.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$form = $this->repository->findById( (int) $request->get_param( 'form_id' ) );

		if ( ! $form ) {
			return $this->notFoundResponse( __( 'Form', 'all-feedback' ) );
		}

		return $this->successResponse(
			array_map( [ $this, 'prepareField' ], $form->getFields() )
		);
	}

	/**
	 * POST /all-feedback/v1/forms/{form_id}/fields
	 *
	 * Append a new field to the form.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function store( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$form = $this->repository->findById( (int) $request->get_param( 'form_id' ) );

		if ( ! $form ) {
			return $this->notFoundResponse( __( 'Form', 'all-feedback' ) );
		}

		try {
			$dto   = FormFieldDTO::fromArray( $request->get_params() );
			$field = new FormField(
				id:          0,
				formId:      $form->getId(),
				type:        $dto->type,
				label:       $dto->label,
				sortOrder:   $dto->sortOrder,
				required:    $dto->required,
				placeholder: $dto->placeholder,
				choices:     $dto->choices,
				settings:    $dto->settings,
			);
			$form->addField( $field );
			$saved = $this->repository->save( $form );

			$newField = end( $saved->getFields() );
			return $this->successResponse( $this->prepareField( $newField ), 201 );
		} catch ( \Throwable $e ) {
			return $this->exceptionToResponse( $e );
		}
	}

	/**
	 * GET /all-feedback/v1/forms/{form_id}/fields/{id}
	 *
	 * Return a single field by its primary key.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function show( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$field = $this->resolveField( $request );

		if ( $field instanceof \WP_Error ) {
			return $field;
		}

		return $this->successResponse( $this->prepareField( $field ) );
	}

	/**
	 * POST /all-feedback/v1/forms/{form_id}/fields/{id}
	 *
	 * Apply a partial or full update to an existing field.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function update( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$form = $this->repository->findById( (int) $request->get_param( 'form_id' ) );

		if ( ! $form ) {
			return $this->notFoundResponse( __( 'Form', 'all-feedback' ) );
		}

		$fieldId = (int) $request->get_param( 'id' );
		$field   = $this->findFieldInForm( $form->getFields(), $fieldId );

		if ( ! $field ) {
			return $this->notFoundResponse( __( 'Field', 'all-feedback' ) );
		}

		try {
			$body = $request->get_json_params() ?? [];
			$this->applyFieldUpdates( $field, $body, $request );
			$saved       = $this->repository->save( $form );
			$savedField  = $this->findFieldInForm( $saved->getFields(), $fieldId );

			return $this->successResponse( $this->prepareField( $savedField ?? $field ) );
		} catch ( \Throwable $e ) {
			return $this->exceptionToResponse( $e );
		}
	}

	/**
	 * DELETE /all-feedback/v1/forms/{form_id}/fields/{id}
	 *
	 * Remove a field from the form.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function destroy( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$form = $this->repository->findById( (int) $request->get_param( 'form_id' ) );

		if ( ! $form ) {
			return $this->notFoundResponse( __( 'Form', 'all-feedback' ) );
		}

		$fieldId       = (int) $request->get_param( 'id' );
		$filteredFields = array_values(
			array_filter( $form->getFields(), fn( FormField $f ) => $f->getId() !== $fieldId )
		);

		if ( count( $filteredFields ) === count( $form->getFields() ) ) {
			return $this->notFoundResponse( __( 'Field', 'all-feedback' ) );
		}

		try {
			$form->setFields( $filteredFields );
			$this->repository->save( $form );
			return $this->successResponse( [ 'deleted' => true, 'id' => $fieldId ] );
		} catch ( \Throwable $e ) {
			return $this->exceptionToResponse( $e );
		}
	}

	// ------------------------------------------------------------------
	// Argument schemas
	// ------------------------------------------------------------------

	/**
	 * Route-level argument for the parent form_id path parameter.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	private function formIdArg(): array {
		return [
			'form_id' => [
				'description'       => __( 'Unique identifier of the parent form.', 'all-feedback' ),
				'type'              => 'integer',
				'required'          => true,
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
				'validate_callback' => 'rest_validate_request_arg',
			],
		];
	}

	/**
	 * Body arguments for field create (required=true) and update (required=false).
	 *
	 * @param bool $required Whether core attributes are required.
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	private function writeArgs( bool $required ): array {
		return [
			'type'        => $this->argEnum(
				description: __( 'Field type.', 'all-feedback' ),
				values:      FormFieldType::values(),
				required:    $required,
			),
			'label'       => $this->argString(
				description: __( 'Human-visible field label.', 'all-feedback' ),
				required:    $required,
				minLength:   1,
				maxLength:   500,
			),
			'sort_order'  => $this->argInteger(
				description: __( 'Display order within the form (0-based).', 'all-feedback' ),
				min:         0,
				default:     0,
			),
			'required'    => $this->argBoolean(
				description: __( 'Whether respondents must answer this field.', 'all-feedback' ),
				default:     false,
			),
			'placeholder' => $this->argString(
				description: __( 'Hint text shown inside the input.', 'all-feedback' ),
				maxLength:   300,
				default:     '',
			),
			'choices'     => [
				'description' => __( 'Pre-defined answer choices for choice-type fields.', 'all-feedback' ),
				'type'        => 'array',
				'items'       => [ 'type' => 'string', 'maxLength' => 200 ],
			],
			'settings'    => [
				'description'          => __( 'Field-type-specific settings (min/max stars, NPS labels, etc.).', 'all-feedback' ),
				'type'                 => 'object',
				'additionalProperties' => true,
			],
		];
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Resolve a field from the route params, returning a WP_Error on failure.
	 *
	 * @param \WP_REST_Request $request
	 * @return FormField|\WP_Error
	 * @since 1.0.0
	 */
	private function resolveField( \WP_REST_Request $request ): FormField|\WP_Error {
		$form = $this->repository->findById( (int) $request->get_param( 'form_id' ) );

		if ( ! $form ) {
			return $this->notFoundResponse( __( 'Form', 'all-feedback' ) );
		}

		$field = $this->findFieldInForm( $form->getFields(), (int) $request->get_param( 'id' ) );

		if ( ! $field ) {
			return $this->notFoundResponse( __( 'Field', 'all-feedback' ) );
		}

		return $field;
	}

	/**
	 * Find a FormField by ID within an array of fields.
	 *
	 * @param FormField[] $fields
	 * @param int         $fieldId
	 * @return FormField|null
	 * @since 1.0.0
	 */
	private function findFieldInForm( array $fields, int $fieldId ): ?FormField {
		foreach ( $fields as $field ) {
			if ( $field->getId() === $fieldId ) {
				return $field;
			}
		}
		return null;
	}

	/**
	 * Apply only the attributes present in $body to the given field.
	 *
	 * @param FormField            $field
	 * @param array<string, mixed> $body  Raw JSON body keys (presence detection).
	 * @param \WP_REST_Request     $request
	 * @since 1.0.0
	 */
	private function applyFieldUpdates( FormField $field, array $body, \WP_REST_Request $request ): void {
		if ( array_key_exists( 'label', $body ) ) {
			$field->setLabel( sanitize_text_field( (string) $request->get_param( 'label' ) ) );
		}
		if ( array_key_exists( 'sort_order', $body ) ) {
			$field->setSortOrder( (int) $request->get_param( 'sort_order' ) );
		}
		if ( array_key_exists( 'required', $body ) ) {
			$field->setRequired( (bool) $request->get_param( 'required' ) );
		}
		if ( array_key_exists( 'placeholder', $body ) ) {
			$field->setPlaceholder( sanitize_text_field( (string) $request->get_param( 'placeholder' ) ) );
		}
		if ( array_key_exists( 'choices', $body ) ) {
			$field->setChoices( array_map( 'sanitize_text_field', (array) $request->get_param( 'choices' ) ) );
		}
		if ( array_key_exists( 'settings', $body ) ) {
			$field->setSettings( (array) $request->get_param( 'settings' ) );
		}
	}

	/**
	 * Serialise a FormField into the REST response shape.
	 *
	 * @param FormField $field
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	private function prepareField( FormField $field ): array {
		return [
			'id'          => $field->getId(),
			'form_id'     => $field->getFormId(),
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
