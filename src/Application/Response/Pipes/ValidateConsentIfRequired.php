<?php

declare(strict_types=1);

namespace AllFeedback\Application\Response\Pipes;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\ValidationException;

/**
 * Pipeline stage: enforce consent when the survey settings require it.
 *
 * @package AllFeedback\Application\Response\Pipes
 * @since   1.0.0
 */
class ValidateConsentIfRequired {

	/**
	 * Reject the submission when the survey requires consent and the respondent
	 * has not provided it.
	 *
	 * @param  ResponseContext $context Shared pipeline context.
	 * @param  \Closure        $next    Next stage in the pipeline.
	 * @return mixed
	 * @throws ValidationException When consent is required but was not given.
	 * @since  1.0.0
	 */
	public function execute( ResponseContext $context, \Closure $next ): mixed {
		$settings        = $context->survey->getSettings();
		$consentRequired = ! empty( $settings['require_consent'] );

		if ( $consentRequired && ! $context->dto->consentGiven ) {
			throw ValidationException::withErrors(
				[ 'consent_given' => esc_html__( 'You must provide consent to submit a response to this survey.', 'all-feedback' ) ]
			);
		}

		return $next( $context );
	}
}
