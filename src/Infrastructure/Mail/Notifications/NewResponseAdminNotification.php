<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail\Notifications;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Infrastructure\Mail\Mailer;
use AllFeedback\Infrastructure\Mail\NotificationContext;

/**
 * Sends an alert email to the site admin when a new survey response is submitted.
 *
 * This notification is only dispatched when the `email_notifications` setting
 * is enabled.  The recipient defaults to `admin_email` but can be overridden
 * via the `notification_email` setting.
 *
 * @package AllFeedback\Infrastructure\Mail\Notifications
 * @since   1.0.0
 */
class NewResponseAdminNotification {

	/**
	 * @param  Mailer          $mailer   Mailer for dispatching the email.
	 * @param  SettingsManager $settings Plugin settings for toggling and recipient configuration.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Mailer $mailer,
		private readonly SettingsManager $settings,
	) {}

	/**
	 * Compose and dispatch the new-response alert to the configured admin address.
	 *
	 * @param  NotificationContext $context Context containing the survey and response aggregates.
	 * @return bool True when the email was dispatched successfully.
	 * @since  1.0.0
	 */
	public function send( NotificationContext $context ): bool {
		if ( ! $this->settings->get( 'email_notifications' ) ) {
			return false;
		}

		$notificationEmail = (string) $this->settings->get( 'notification_email' );
		$adminEmail        = $notificationEmail !== '' ? $notificationEmail : (string) get_option( 'admin_email' );

		$vars    = $this->buildVars( $context );
		$subject = $this->mailer->interpolate(
			__( 'New response received for: {survey_title}', 'all-feedback' ),
			$vars
		);

		$body = $this->mailer->interpolate(
			implode( "\n\n", [
				__( 'A new response has been submitted for your survey.', 'all-feedback' ),
				sprintf( __( 'Survey: %s', 'all-feedback' ), '{survey_title}' ),
				sprintf( __( 'Response ID: %s', 'all-feedback' ), '{response_id}' ),
				sprintf( __( 'Submitted at: %s', 'all-feedback' ), '{submitted_at}' ),
				sprintf( __( 'Site: %s', 'all-feedback' ), '{site_name}' ),
			] ),
			$vars
		);

		return $this->mailer->send( $adminEmail, $subject, $body );
	}

	/**
	 * Build the template variable map from the notification context.
	 *
	 * @param  NotificationContext $context Context containing the survey and response aggregates.
	 * @return array<string, string>
	 * @since  1.0.0
	 */
	private function buildVars( NotificationContext $context ): array {
		$survey   = $context->getSurvey();
		$response = $context->getResponse();

		return [
			'survey_title' => $survey->getTitle(),
			'survey_id'    => (string) $survey->getId(),
			'response_id'  => $response ? (string) $response->getId() : '',
			'submitted_at' => $response ? $response->getCreatedAt()->format( 'Y-m-d H:i:s' ) : '',
			'site_name'    => get_bloginfo( 'name' ),
			'site_url'     => home_url(),
		];
	}
}
