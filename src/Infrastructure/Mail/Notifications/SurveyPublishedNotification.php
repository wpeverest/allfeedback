<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail\Notifications;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Infrastructure\Mail\Mailer;
use AllFeedback\Infrastructure\Mail\NotificationContext;

/**
 * Sends an informational email to the site admin when a survey is activated.
 *
 * Fired by NotificationServiceProvider on the `allfeedback:survey:activated` action.
 * Only dispatched when `email_notifications` is enabled in plugin settings.
 *
 * @package AllFeedback\Infrastructure\Mail\Notifications
 * @since   1.0.0
 */
class SurveyPublishedNotification {

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
	 * Compose and dispatch the survey-published alert to the admin email.
	 *
	 * @param  NotificationContext $context Context containing the activated survey aggregate.
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
			__( 'Survey activated: {survey_title}', 'all-feedback' ),
			$vars
		);

		$body = $this->mailer->interpolate(
			implode( "\n\n", [
				__( 'A survey has just been activated and is now collecting responses.', 'all-feedback' ),
				sprintf( __( 'Survey: %s', 'all-feedback' ), '{survey_title}' ),
				sprintf( __( 'Activated at: %s', 'all-feedback' ), '{activated_at}' ),
				sprintf( __( 'Site: %s', 'all-feedback' ), '{site_name}' ),
			] ),
			$vars
		);

		return $this->mailer->send( $adminEmail, $subject, $body );
	}

	/**
	 * Build the template variable map from the notification context.
	 *
	 * @param  NotificationContext $context Context containing the activated survey aggregate.
	 * @return array<string, string>
	 * @since  1.0.0
	 */
	private function buildVars( NotificationContext $context ): array {
		$survey = $context->getSurvey();

		return [
			'survey_title' => $survey->getTitle(),
			'survey_id'    => (string) $survey->getId(),
			'activated_at' => current_time( 'mysql' ),
			'site_name'    => get_bloginfo( 'name' ),
			'site_url'     => home_url(),
		];
	}
}
