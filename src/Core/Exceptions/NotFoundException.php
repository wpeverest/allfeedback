<?php

declare(strict_types=1);

namespace AllFeedback\Core\Exceptions;

defined( 'ABSPATH' ) || exit;

/**
 * Class NotFoundException
 *
 * Thrown when a requested resource cannot be found in the persistence layer.
 * Controllers should translate this to a 404 HTTP response via
 * RestController::exceptionToResponse().
 *
 * @package AllFeedback\Core\Exceptions
 * @since   1.0.0
 */
class NotFoundException extends AllFeedbackException {

	/**
	 * Factory: build a NotFoundException for a named resource.
	 *
	 * @param  string $resource Human-readable resource name, e.g. "Form".
	 * @param  int    $id       The ID that was not found.
	 * @return static
	 * @since  1.0.0
	 */
	public static function forResource( string $resource, int $id ): static {
		return new static(
			sprintf(
				/* translators: 1: Resource name 2: Resource ID */
				__( '%1$s with ID %2$d could not be found.', 'all-feedback' ),
				$resource,
				$id
			)
		);
	}
}
