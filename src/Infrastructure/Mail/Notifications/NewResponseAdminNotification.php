<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail\Notifications;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Infrastructure\Mail\Mailer;
use AllFeedback\Infrastructure\Mail\NotificationContext;
use AllFeedback\Traits\Hooks;

/**
 * Sends an alert email to the configured admin address when a new response is submitted.
 *
 * @package AllFeedback\Infrastructure\Mail\Notifications
 * @since   1.0.0
 */
class NewResponseAdminNotification {

	use Hooks;

	/**
	 * @param  Mailer          $mailer   Mailer for dispatching the email.
	 * @param  SettingsManager $settings Plugin settings.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Mailer $mailer,
		private readonly SettingsManager $settings,
	) {}

	/**
	 * Compose and send the new-response alert to the configured admin address.
	 *
	 * @param  NotificationContext $context Survey and response aggregates.
	 * @return bool True when the email was dispatched successfully, false when skipped.
	 * @since  1.0.0
	 */
	public function send( NotificationContext $context ): bool {
		if ( ! $this->settings->get( 'email.notifications.admin_enabled' ) ) {
			return false;
		}

		$to   = (string) ( $this->settings->get( 'email.delivery.to_email' ) ?: get_option( 'admin_email' ) );
		$vars = $this->buildVars( $context );

		$subject = (string) $this->applyFilters(
			'allfeedback:mail:admin_subject',
			$this->mailer->interpolate(
				/* translators: %s: survey title placeholder */
				__( 'New response received for: {survey_title}', 'allfeedback' ),
				$vars
			),
			$vars
		);

		$ctaButton = '<a href="{admin_url}" style="display:inline-block;padding:10px 24px;background:#6366f1;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">'
			. esc_html__( 'View Response →', 'allfeedback' )
			. '</a>';

		$body = $this->mailer->interpolate(
			implode( "\n\n", array_filter( [
				__( 'A new response has been submitted for your survey.', 'allfeedback' ),
				/* translators: %s: survey title */
				sprintf( __( 'Survey: %s', 'allfeedback' ), '<strong>{survey_title}</strong>' ),
				$vars['score_badge'] !== '' ? '{score_badge}' : null,
				/* translators: %s: response ID */
				sprintf( __( 'Response ID: %s', 'allfeedback' ), '#{response_id}' ),
				/* translators: %s: submission date and time */
				sprintf( __( 'Submitted at: %s', 'allfeedback' ), '{submitted_at}' ),
				$ctaButton,
			] ) ),
			$vars
		);

		$body = (string) $this->applyFilters( 'allfeedback:mail:admin_body', $body, $vars );

		return $this->mailer->send( $to, $subject, $body );
	}

	/**
	 * Build the template variable map from the notification context.
	 *
	 * @param  NotificationContext $context Survey and response aggregates.
	 * @return array<string, string>
	 * @since  1.0.0
	 */
	private function buildVars( NotificationContext $context ): array {
		$survey     = $context->getSurvey();
		$response   = $context->getResponse();
		$responseId = $response ? (int) $response->getId() : 0;

		return [
			'survey_title' => esc_html( $survey->getTitle() ),
			'survey_id'    => (string) $survey->getId(),
			'response_id'  => $response ? (string) $responseId : '',
			'submitted_at' => $response
				? esc_html( $response->getCreatedAt()->format( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ) ) )
				: '',
			'site_name'    => esc_html( get_bloginfo( 'name' ) ),
			'site_url'     => esc_url( home_url() ),
			'score_badge'  => $response ? $this->buildScoreBadge( $response->getScore() ) : '',
			'admin_url'    => esc_url( admin_url( 'admin.php' ) . '?page=allfeedback#/responses/' . $responseId ),
		];
	}

	/**
	 * Build a colour-coded NPS score badge HTML snippet.
	 *
	 * Returns an empty string when $score is null so the caller can conditionally
	 * omit the badge from the email body.
	 *
	 * @param  float|null $score NPS score (0–10), or null when no score was captured.
	 * @return string HTML <span> badge, or empty string.
	 * @since  1.0.0
	 */
	private function buildScoreBadge( ?float $score ): string {
		if ( $score === null ) {
			return '';
		}

		if ( $score >= 9 ) {
			$label = __( 'Promoter', 'allfeedback' );
			$color = '#16a34a';
			$bg    = '#dcfce7';
		} elseif ( $score >= 7 ) {
			$label = __( 'Passive', 'allfeedback' );
			$color = '#d97706';
			$bg    = '#fef3c7';
		} else {
			$label = __( 'Detractor', 'allfeedback' );
			$color = '#dc2626';
			$bg    = '#fee2e2';
		}

		return sprintf(
			'<span style="display:inline-block;background:%s;padding:4px 12px;border-radius:99px;font-size:13px;font-weight:600;color:%s;">%s &middot; %s/10</span>',
			esc_attr( $bg ),
			esc_attr( $color ),
			esc_html( $label ),
			(int) $score
		);
	}
}
