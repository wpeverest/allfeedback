<?php

declare(strict_types=1);

namespace AllFeedback\Application\Response\Pipes;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\ValidationException;

/**
 * Pipeline stage: assert that the target survey is published.
 *
 * @package AllFeedback\Application\Response\Pipes
 * @since   1.0.0
 */
class ValidateSurveyIsActive implements PipeInterface {

	/**
	 * Reject the submission when the survey status is not Published.
	 *
	 * Admin users (userId > 0 with manage_options) bypass this check so they
	 * can test unpublished surveys. The check uses the DTO's userId rather than
	 * calling current_user_can() directly, keeping this pipe free of WP globals.
	 *
	 * @param  ResponseContext $context Shared pipeline context.
	 * @param  \Closure        $next    Next stage in the pipeline.
	 * @return mixed
	 * @throws ValidationException When the survey is not published.
	 * @since  1.0.0
	 */
	public function execute( ResponseContext $context, \Closure $next ): mixed {
		$isAdmin = $context->dto->userId > 0 && user_can( $context->dto->userId, 'manage_options' );

		if ( ! $context->survey->getStatus()->isPublished() && ! $isAdmin ) {
			throw ValidationException::withErrors(
				[ 'survey' => esc_html__( 'This survey is not currently accepting responses.', 'allfeedback' ) ]
			);
		}

		return $next( $context );
	}
}
