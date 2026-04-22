<?php

declare(strict_types=1);

namespace AllFeedback\Application\Response\Pipes;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Domain\Survey\SurveyStatus;

/**
 * Pipeline stage: assert that the target survey is published.
 *
 * @package AllFeedback\Application\Response\Pipes
 * @since   1.0.0
 */
class ValidateSurveyIsActive {

	/**
	 * Reject the submission when the survey status is not Published.
	 *
	 * @param  ResponseContext $context Shared pipeline context.
	 * @param  \Closure        $next    Next stage in the pipeline.
	 * @return mixed
	 * @throws ValidationException When the survey is not published.
	 * @since  1.0.0
	 */
	public function execute( ResponseContext $context, \Closure $next ): mixed {
		if ( ! $context->survey->getStatus()->isPublished() && ! current_user_can( 'manage_options' ) ) {
			throw ValidationException::withErrors(
				[ 'survey' => esc_html__( 'This survey is not currently accepting responses.', 'all-feedback' ) ]
			);
		}

		return $next( $context );
	}
}
