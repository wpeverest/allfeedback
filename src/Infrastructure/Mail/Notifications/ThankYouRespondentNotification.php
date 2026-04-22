<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail\Notifications;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Infrastructure\Mail\Mailer;
use AllFeedback\Infrastructure\Mail\NotificationContext;

/**
 * Sends a thank-you email to the respondent after a survey submission.
 *
 * This notification is only sent when:
 *   - `email_notifications` is enabled.
 *   - The response_data array contains a key whose value is a valid email address
 *     (conventionally the field keyed `email`).
 *
 * If no email address can be extracted from the response data this notification
 * is silently skipped.
 *
 * @package AllFeedback\Infrastructure\Mail\Notifications
 * @since   1.0.0
 */
class ThankYouRespondentNotification {

	/**
	 * @param  Mailer          $mailer   Mailer for dispatching the email.
	 * @param  SettingsManager $settings Plugin settings for toggling notifications.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Mailer $mailer,
		private readonly SettingsManager $settings,
	) {}

	/**
	 * Compose and dispatch the thank-you email to the respondent.
	 *
	 * @param  NotificationContext $context Context containing the survey and response aggregates.
	 * @return bool True when the email was dispatched successfully, false when skipped.
	 * @since  1.0.0
	 */
	public function send( NotificationContext $context ): bool {
		if ( ! $this->settings->get( 'email_notifications' ) ) {
			return false;
		}

		$respondentEmail = $this->resolveRespondentEmail( $context );
		if ( $respondentEmail === null ) {
			return false;
		}

		$vars    = $this->buildVars( $context );
		$subject = $this->mailer->interpolate(
			__( 'Thank you for your feedback on {survey_title}', 'all-feedback' ),
			$vars
		);

		$body = $this->mailer->interpolate(
			implode( "\n\n", [
				__( 'Thank you for taking the time to share your feedback with us.', 'all-feedback' ),
				__( 'Your response has been recorded and will help us improve.', 'all-feedback' ),
				sprintf( __( 'Survey: %s', 'all-feedback' ), '{survey_title}' ),
				sprintf( __( 'Site: %s (%s)', 'all-feedback' ), '{site_name}', '{site_url}' ),
			] ),
			$vars
		);

		return $this->mailer->send( $respondentEmail, $subject, $body );
	}

	/**
	 * Attempt to resolve the respondent email from the response_data payload.
	 *
	 * @param  NotificationContext $context Context containing the response aggregate.
	 * @return string|null The first valid email found in response_data, or null.
	 * @since  1.0.0
	 */
	private function resolveRespondentEmail( NotificationContext $context ): ?string {
		$response = $context->getResponse();
		if ( ! $response ) {
			return null;
		}

		$data = $response->getResponseData();

		foreach ( $data as $value ) {
			if ( is_string( $value ) && filter_var( $value, FILTER_VALIDATE_EMAIL ) ) {
				return $value;
			}
		}

		return null;
	}

	/**
	 * Build the template variable map from the notification context.
	 *
	 * @param  NotificationContext $context Context containing the survey aggregate.
	 * @return array<string, string>
	 * @since  1.0.0
	 */
	private function buildVars( NotificationContext $context ): array {
		$survey = $context->getSurvey();

		return [
			'survey_title' => esc_html( $survey->getTitle() ),
			'survey_id'    => (string) $survey->getId(),
			'site_name'    => esc_html( get_bloginfo( 'name' ) ),
			'site_url'     => esc_url( home_url() ),
		];
	}
}
