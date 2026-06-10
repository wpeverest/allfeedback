<?php
/**
 * Validate consent if required.
 *
 * @package AllFeedback\Application\Response\Pipes
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Application\Response\Pipes;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Core\Settings\SettingsManager;

/**
 * Pipeline stage: enforce consent when the global privacy settings require it.
 *
 * @package AllFeedback\Application\Response\Pipes
 * @since   1.0.0
 */
class ValidateConsentIfRequired implements PipeInterface {

	/**
	 * Constructor.
	 *
	 * @param  SettingsManager $settings_manager Plugin-wide settings store.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SettingsManager $settings_manager,
	) {}

	/**
	 * Reject the submission when consent is globally required and the respondent
	 * has not provided it.
	 *
	 * @param  ResponseContext $context Shared pipeline context.
	 * @param  \Closure        $next    Next stage in the pipeline.
	 * @return mixed
	 * @throws ValidationException When consent is required but was not given.
	 * @since  1.0.0
	 */
	public function execute( ResponseContext $context, \Closure $next ): mixed {
		$consent_required = (bool) $this->settings_manager->get( 'advanced.privacy.require_consent' );

		if ( $consent_required && ! $context->dto->consent_given ) {
			throw ValidationException::withErrors(
				[ 'consent_given' => esc_html__( 'You must provide consent to submit a response to this survey.', 'allfeedback' ) ]
			);
		}

		return $next( $context );
	}
}
