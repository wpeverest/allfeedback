<?php

declare(strict_types=1);

namespace AllFeedback\API;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Core\Exceptions\ValidationException;

/**
 * Class RestController
 *
 * Abstract base for all AllFeedback V1 REST controllers.
 * Provides shared helpers for response construction, permission checks,
 * argument schema builders, and exception-to-response translation so that
 * concrete controllers stay focused on routing and business logic delegation.
 *
 * All concrete controllers must implement registerRoutes(), which is called
 * by ApiServiceProvider on the 'rest_api_init' action.
 *
 * @package AllFeedback\API
 * @since   1.0.0
 */
abstract class RestController {

	/**
	 * REST API namespace shared by all V1 routes.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $namespace = 'all-feedback/v1';

	/**
	 * Resource slug for this controller's route base.
	 * Must be overridden in each concrete controller.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $restBase = '';

	/**
	 * Register all REST routes for this controller.
	 * Called by ApiServiceProvider::registerRoutes() on 'rest_api_init'.
	 *
	 * @since 1.0.0
	 */
	abstract public function registerRoutes(): void;

	// ------------------------------------------------------------------
	// Response helpers
	// ------------------------------------------------------------------

	/**
	 * Build a successful JSON response envelope.
	 *
	 * @param mixed $data   Payload to include under the 'data' key.
	 * @param int   $status HTTP status code (default 200).
	 * @return \WP_REST_Response
	 * @since 1.0.0
	 */
	protected function successResponse( mixed $data, int $status = 200 ): \WP_REST_Response {
		return new \WP_REST_Response(
			[
				'success' => true,
				'data'    => $data,
			],
			$status
		);
	}

	/**
	 * Build a generic error WP_Error.
	 *
	 * @param string $message Human-readable error message.
	 * @param int    $status  HTTP status code (default 400).
	 * @return \WP_Error
	 * @since 1.0.0
	 */
	protected function errorResponse( string $message, int $status = 400 ): \WP_Error {
		return new \WP_Error(
			'allfeedback_error',
			$message,
			[ 'status' => $status ]
		);
	}

	/**
	 * Build a 404 Not Found WP_Error.
	 *
	 * @param string $resource Optional resource name to include in the message.
	 * @return \WP_Error
	 * @since 1.0.0
	 */
	protected function notFoundResponse( string $resource = '' ): \WP_Error {
		$message = $resource
			? sprintf(
				/* translators: %s: Resource name */
				__( '%s not found.', 'all-feedback' ),
				$resource
			)
			: __( 'Resource not found.', 'all-feedback' );

		return $this->errorResponse( $message, 404 );
	}

	/**
	 * Build a 403 Forbidden WP_Error.
	 *
	 * @return \WP_Error
	 * @since 1.0.0
	 */
	protected function forbiddenResponse(): \WP_Error {
		return new \WP_Error(
			'allfeedback_forbidden',
			__( 'You do not have permission to perform this action.', 'all-feedback' ),
			[ 'status' => 403 ]
		);
	}

	/**
	 * Translate a domain exception into the appropriate WP_Error response.
	 *
	 * @param \Throwable $e
	 * @return \WP_Error
	 * @since 1.0.0
	 */
	protected function exceptionToResponse( \Throwable $e ): \WP_Error {
		if ( $e instanceof NotFoundException ) {
			return $this->errorResponse( $e->getMessage() ?: __( 'Resource not found.', 'all-feedback' ), 404 );
		}

		if ( $e instanceof ValidationException ) {
			return new \WP_Error(
				'allfeedback_validation_error',
				$e->getMessage(),
				[
					'status'          => 422,
					'additional_data' => [ 'errors' => $e->getErrors() ],
				]
			);
		}

		return $this->errorResponse( __( 'An unexpected error occurred.', 'all-feedback' ), 500 );
	}

	// ------------------------------------------------------------------
	// Permission helpers
	// ------------------------------------------------------------------

	/**
	 * Allow all requests including unauthenticated ones.
	 * Use for read-only, non-sensitive public endpoints.
	 *
	 * @return bool
	 * @since 1.0.0
	 */
	public function publicPermission(): bool {
		return true;
	}

	/**
	 * Allow only logged-in users with manage_options capability.
	 *
	 * @return bool
	 * @since 1.0.0
	 */
	public function adminPermission(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Allow any authenticated user.
	 *
	 * @return bool
	 * @since 1.0.0
	 */
	public function authenticatedPermission(): bool {
		return is_user_logged_in();
	}

	// ------------------------------------------------------------------
	// Argument schema builders
	// ------------------------------------------------------------------

	/**
	 * Build a REST integer argument descriptor.
	 *
	 * @param string   $description Human-readable description.
	 * @param bool     $required    Whether the argument is required.
	 * @param int      $min         Minimum acceptable value.
	 * @param int|null $max         Maximum acceptable value (null = no upper bound).
	 * @param mixed    $default     Default value (null = no default).
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	protected function argInteger(
		string $description,
		bool $required   = false,
		int $min         = 0,
		?int $max        = null,
		mixed $default   = null,
	): array {
		$arg = [
			'description'       => $description,
			'type'              => 'integer',
			'required'          => $required,
			'minimum'           => $min,
			'sanitize_callback' => 'absint',
			'validate_callback' => 'rest_validate_request_arg',
		];
		if ( $max !== null ) {
			$arg['maximum'] = $max;
		}
		if ( $default !== null ) {
			$arg['default'] = $default;
		}
		return $arg;
	}

	/**
	 * Build a REST string argument descriptor.
	 *
	 * @param string          $description Human-readable description.
	 * @param bool            $required    Whether the argument is required.
	 * @param int|null        $minLength   Minimum string length.
	 * @param int|null        $maxLength   Maximum string length.
	 * @param string|callable $sanitize    Sanitize callback (default sanitize_text_field).
	 * @param mixed           $default     Default value (null = no default).
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	protected function argString(
		string $description,
		bool $required           = false,
		?int $minLength          = null,
		?int $maxLength          = null,
		string|callable $sanitize = 'sanitize_text_field',
		mixed $default           = null,
	): array {
		$arg = [
			'description'       => $description,
			'type'              => 'string',
			'required'          => $required,
			'sanitize_callback' => $sanitize,
			'validate_callback' => 'rest_validate_request_arg',
		];
		if ( $minLength !== null ) {
			$arg['minLength'] = $minLength;
		}
		if ( $maxLength !== null ) {
			$arg['maxLength'] = $maxLength;
		}
		if ( $default !== null ) {
			$arg['default'] = $default;
		}
		return $arg;
	}

	/**
	 * Build a REST boolean argument descriptor.
	 *
	 * @param string $description Human-readable description.
	 * @param bool   $required    Whether the argument is required.
	 * @param bool   $default     Default value.
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	protected function argBoolean(
		string $description,
		bool $required = false,
		bool $default  = false,
	): array {
		return [
			'description'       => $description,
			'type'              => 'boolean',
			'required'          => $required,
			'default'           => $default,
			'sanitize_callback' => 'rest_sanitize_boolean',
			'validate_callback' => 'rest_validate_request_arg',
		];
	}

	/**
	 * Build a REST enum argument descriptor.
	 *
	 * @param string          $description Human-readable description.
	 * @param string[]        $values      Allowed enum values.
	 * @param bool            $required    Whether the argument is required.
	 * @param string|callable $sanitize    Sanitize callback (default sanitize_key).
	 * @param mixed           $default     Default value (null = no default).
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	protected function argEnum(
		string $description,
		array $values,
		bool $required           = false,
		string|callable $sanitize = 'sanitize_key',
		mixed $default           = null,
	): array {
		$arg = [
			'description'       => $description,
			'type'              => 'string',
			'required'          => $required,
			'enum'              => $values,
			'sanitize_callback' => $sanitize,
			'validate_callback' => 'rest_validate_request_arg',
		];
		if ( $default !== null ) {
			$arg['default'] = $default;
		}
		return $arg;
	}

	/**
	 * Return standard pagination arguments (page + per_page).
	 *
	 * @param int $defaultPerPage Items per page to use when the arg is absent.
	 * @param int $maxPerPage     Hard upper limit on per_page.
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	protected function paginationArgs( int $defaultPerPage = 20, int $maxPerPage = 100 ): array {
		return [
			'page'     => $this->argInteger(
				description: __( 'Current page of the collection (1-based).', 'all-feedback' ),
				min:         1,
				default:     1,
			),
			'per_page' => $this->argInteger(
				description: sprintf(
					/* translators: %d: maximum items per page */
					__( 'Maximum results per page (max %d).', 'all-feedback' ),
					$maxPerPage
				),
				min:         1,
				max:         $maxPerPage,
				default:     $defaultPerPage,
			),
		];
	}

	/**
	 * Return the standard route-level 'id' argument descriptor.
	 *
	 * @param string $description Optional override description.
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	protected function idArg( string $description = '' ): array {
		return [
			'id' => [
				'description'       => $description ?: __( 'Unique identifier for the resource.', 'all-feedback' ),
				'type'              => 'integer',
				'required'          => true,
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
				'validate_callback' => 'rest_validate_request_arg',
			],
		];
	}
}
