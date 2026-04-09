<?php

declare(strict_types=1);

namespace AllFeedback\Application\Response\Pipes;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\ValidationException;

/**
 * Pipeline stage: assert that the response payload contains at least one answer.
 *
 * @package AllFeedback\Application\Response\Pipes
 * @since   1.0.0
 */
class ValidateResponseData {

	/**
	 * Reject the submission when response_data is empty.
	 *
	 * @param ResponseContext $context Shared pipeline context.
	 * @param \Closure        $next    Next stage in the pipeline.
	 * @return mixed
	 * @throws ValidationException When response_data is empty.
	 * @since 1.0.0
	 */
	public function execute( ResponseContext $context, \Closure $next ): mixed {
		if ( empty( $context->dto->responseData ) ) {
			throw ValidationException::withErrors(
				[ 'response_data' => esc_html__( 'Response data cannot be empty.', 'all-feedback' ) ]
			);
		}

		return $next( $context );
	}
}
