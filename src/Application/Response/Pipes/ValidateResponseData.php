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
	 * @param  ResponseContext $context Shared pipeline context.
	 * @param  \Closure        $next    Next stage in the pipeline.
	 * @return mixed
	 * @throws ValidationException When response_data is empty.
	 * @since  1.0.0
	 */
	public function execute( ResponseContext $context, \Closure $next ): mixed {
		$data = $context->dto->responseData;

		if ( empty( $data ) ) {
			throw ValidationException::withErrors(
				[ 'response_data' => esc_html__( 'Response data cannot be empty.', 'allfeedback' ) ]
			);
		}

		$maxKeys = max( 1, (int) apply_filters( 'allfeedback_response_max_keys', 100 ) );
		if ( count( $data ) > $maxKeys ) {
			throw ValidationException::withErrors(
				[ 'response_data' => esc_html__( 'Response data contains too many fields.', 'allfeedback' ) ]
			);
		}

		$maxLength = max( 1, (int) apply_filters( 'allfeedback_response_max_value_length', 5000 ) );
		array_walk_recursive(
			$data,
			function ( $value ) use ( $maxLength ): void {
				if ( is_string( $value ) && mb_strlen( $value ) > $maxLength ) {
					throw ValidationException::withErrors(
						[ 'response_data' => esc_html__( 'A response value exceeds the maximum allowed length.', 'allfeedback' ) ]
					);
				}
			}
		);

		return $next( $context );
	}
}
