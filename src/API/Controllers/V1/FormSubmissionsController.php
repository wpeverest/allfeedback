<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Application\FormSubmission\FormSubmissionDTO;
use AllFeedback\Application\FormSubmission\SubmitFormService;
use AllFeedback\Domain\Form\FormRepository;
use AllFeedback\Domain\FormSubmission\FormSubmission;
use AllFeedback\Domain\FormSubmission\FormSubmissionRepository;

/**
 * Class FormSubmissionsController
 *
 * REST controller for the /forms/{form_id}/submissions resource.
 *
 * Routes registered:
 *   POST   /all-feedback/v1/forms/{form_id}/submissions          → submit()   : accept a new submission
 *   GET    /all-feedback/v1/forms/{form_id}/submissions          → index()    : list submissions (admin)
 *   GET    /all-feedback/v1/forms/{form_id}/submissions/{id}     → show()     : single submission (admin)
 *   DELETE /all-feedback/v1/forms/{form_id}/submissions/{id}     → destroy()  : delete a submission (admin)
 *
 * Submission endpoint (POST) is intentionally public so that anonymous
 * respondents can submit without requiring a WordPress account.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class FormSubmissionsController extends RestController {

	/**
	 * @since 1.0.0
	 */
	protected string $restBase = 'forms/(?P<form_id>\d+)/submissions';

	/**
	 * @param FormRepository           $formRepository       Persistence port for Form aggregates.
	 * @param FormSubmissionRepository $submissionRepository Persistence port for FormSubmission aggregates.
	 * @param SubmitFormService        $submitService        Submission orchestration service.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly FormRepository $formRepository,
		private readonly FormSubmissionRepository $submissionRepository,
		private readonly SubmitFormService $submitService,
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
					'args'                => array_merge( $this->formIdArg(), $this->paginationArgs() ),
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'submit' ],
					'permission_callback' => [ $this, 'publicPermission' ],
					'args'                => array_merge( $this->formIdArg(), $this->submitArgs() ),
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
					'args'                => array_merge( $this->formIdArg(), $this->idArg() ),
				],
				[
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'destroy' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge( $this->formIdArg(), $this->idArg() ),
				],
				'schema' => [ $this, 'getPublicItemSchema' ],
			]
		);
	}

	// ------------------------------------------------------------------
	// Route handlers
	// ------------------------------------------------------------------

	/**
	 * POST /all-feedback/v1/forms/{form_id}/submissions
	 *
	 * Accept and persist a respondent's form submission.
	 * Publicly accessible — no login required.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function submit( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$formId = (int) $request->get_param( 'form_id' );

		try {
			$dto        = FormSubmissionDTO::fromArray( $formId, $this->extractSubmissionData( $request ) );
			$submission = $this->submitService->execute( $dto );
			return $this->successResponse( $this->prepareSubmission( $submission ), 201 );
		} catch ( \Throwable $e ) {
			return $this->exceptionToResponse( $e );
		}
	}

	/**
	 * GET /all-feedback/v1/forms/{form_id}/submissions
	 *
	 * Return a paginated list of submissions for the given form.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$formId = (int) $request->get_param( 'form_id' );
		$form   = $this->formRepository->findById( $formId );

		if ( ! $form ) {
			return $this->notFoundResponse( __( 'Form', 'all-feedback' ) );
		}

		$page    = max( 1, (int) ( $request->get_param( 'page' ) ?? 1 ) );
		$perPage = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?? 20 ) ) );
		$offset  = ( $page - 1 ) * $perPage;

		$submissions = $this->submissionRepository->findByFormId( $formId, $perPage, $offset );
		$total       = $this->submissionRepository->countByFormId( $formId );

		return $this->successResponse(
			[
				'submissions' => array_map( [ $this, 'prepareSubmission' ], $submissions ),
				'total'       => $total,
				'page'        => $page,
				'per_page'    => $perPage,
			]
		);
	}

	/**
	 * GET /all-feedback/v1/forms/{form_id}/submissions/{id}
	 *
	 * Return a single submission by its primary key.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function show( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$formId       = (int) $request->get_param( 'form_id' );
		$submissionId = (int) $request->get_param( 'id' );
		$submission   = $this->submissionRepository->findById( $submissionId );

		if ( ! $submission || $submission->getFormId() !== $formId ) {
			return $this->notFoundResponse( __( 'Submission', 'all-feedback' ) );
		}

		return $this->successResponse( $this->prepareSubmission( $submission ) );
	}

	/**
	 * DELETE /all-feedback/v1/forms/{form_id}/submissions/{id}
	 *
	 * Permanently delete a single submission record.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function destroy( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$formId       = (int) $request->get_param( 'form_id' );
		$submissionId = (int) $request->get_param( 'id' );
		$submission   = $this->submissionRepository->findById( $submissionId );

		if ( ! $submission || $submission->getFormId() !== $formId ) {
			return $this->notFoundResponse( __( 'Submission', 'all-feedback' ) );
		}

		if ( ! $this->submissionRepository->delete( $submissionId ) ) {
			return $this->errorResponse( __( 'Failed to delete the submission.', 'all-feedback' ), 500 );
		}

		return $this->successResponse( [ 'deleted' => true, 'id' => $submissionId ] );
	}

	// ------------------------------------------------------------------
	// Schema
	// ------------------------------------------------------------------

	/**
	 * Return the JSON schema for a single submission item.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function getPublicItemSchema(): array {
		return [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'allfeedback_form_submission',
			'type'       => 'object',
			'properties' => [
				'id'            => [
					'description' => __( 'Unique identifier.', 'all-feedback' ),
					'type'        => 'integer',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'form_id'       => [
					'description' => __( 'Parent form identifier.', 'all-feedback' ),
					'type'        => 'integer',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'answers'       => [
					'description' => __( 'Field-ID keyed map of respondent answers.', 'all-feedback' ),
					'type'        => 'object',
					'context'     => [ 'view' ],
				],
				'respondent_id' => [
					'description' => __( 'WP user ID (0 = anonymous).', 'all-feedback' ),
					'type'        => 'integer',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'is_anonymous'  => [
					'description' => __( 'Whether the submission was made anonymously.', 'all-feedback' ),
					'type'        => 'boolean',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'submitted_at'  => [
					'description' => __( 'Submission timestamp (ISO 8601).', 'all-feedback' ),
					'type'        => 'string',
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
	 * Body arguments for the public submission endpoint.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	private function submitArgs(): array {
		return [
			'answers'    => [
				'description'          => __( 'Map of field_id (string) → answer value. Arrays are accepted for multi-select fields.', 'all-feedback' ),
				'type'                 => 'object',
				'required'             => true,
				'additionalProperties' => true,
				'validate_callback'    => 'rest_validate_request_arg',
			],
			'ip_address' => $this->argString(
				description: __( 'Respondent IP address. Omit to let the server resolve it.', 'all-feedback' ),
			),
			'user_agent' => $this->argString(
				description: __( 'Respondent browser user-agent string.', 'all-feedback' ),
			),
		];
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Extract and sanitise submission data from the request.
	 * Resolves the IP address and user agent from server globals when not
	 * explicitly provided by the client.
	 *
	 * @param \WP_REST_Request $request
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	private function extractSubmissionData( \WP_REST_Request $request ): array {
		$ipAddress = sanitize_text_field( (string) ( $request->get_param( 'ip_address' ) ?? '' ) );
		$userAgent = sanitize_text_field( (string) ( $request->get_param( 'user_agent' ) ?? '' ) );

		if ( $ipAddress === '' ) {
			// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			$ipAddress = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ) );
		}

		if ( $userAgent === '' ) {
			// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			$userAgent = sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ?? '' ) );
		}

		return [
			'answers'      => $request->get_param( 'answers' ) ?? [],
			'ip_address'   => $ipAddress,
			'user_agent'   => $userAgent,
		];
	}

	/**
	 * Serialise a FormSubmission aggregate into the REST response shape.
	 *
	 * @param FormSubmission $submission
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	private function prepareSubmission( FormSubmission $submission ): array {
		return [
			'id'            => $submission->getId(),
			'form_id'       => $submission->getFormId(),
			'answers'       => $submission->getAnswers(),
			'respondent_id' => $submission->getRespondentId(),
			'is_anonymous'  => $submission->isAnonymous(),
			'submitted_at'  => $submission->getSubmittedAt()->format( 'c' ),
		];
	}
}
