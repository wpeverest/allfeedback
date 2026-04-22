<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Support\Logger;
use AllFeedback\Traits\Hooks;

/**
 * Thin wrapper around wp_mail() with HTML layout, header normalisation,
 * and filter extensibility.
 *
 * The sender name and address default to the site name and admin email when
 * not configured in plugin settings.
 *
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */
class Mailer {

	use Hooks;

	/**
	 * @param  SettingsManager $settings Plugin settings for sender name and address.
	 * @param  Logger          $logger   Logger for recording send failures.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SettingsManager $settings,
		private readonly Logger $logger,
	) {}

	/**
	 * Send an HTML email via wp_mail().
	 *
	 * Headers are merged with a Content-Type and From header derived from plugin
	 * settings. The body is wrapped in a minimal HTML layout before dispatch.
	 *
	 * @param  string   $to      Recipient email address.
	 * @param  string   $subject Email subject line.
	 * @param  string   $body    Plain or partial HTML body content.
	 * @param  string[] $headers Additional raw email headers.
	 * @return bool True when wp_mail() reports success.
	 * @since  1.0.0
	 */
	public function send( string $to, string $subject, string $body, array $headers = [] ): bool {
		$senderName  = (string) ( $this->settings->get( 'email_sender_name' ) ?: get_bloginfo( 'name' ) );
		$senderEmail = (string) ( $this->settings->get( 'email_sender_email' ) ?: get_option( 'admin_email' ) );

		$headers[] = 'Content-Type: text/html; charset=UTF-8';
		$headers[] = sprintf( 'From: %s <%s>', $senderName, $senderEmail );

		/**
		 * Filters the email headers before sending.
		 *
		 * @param string[] $headers Email headers.
		 * @param string   $to      Recipient address.
		 * @param string   $subject Email subject.
		 */
		$headers = $this->applyFilters( 'allfeedback:mail:headers', $headers, $to, $subject );

		$htmlBody = $this->wrapInLayout( $body, $subject );

		/**
		 * Filters the final HTML body before sending.
		 *
		 * @param string $htmlBody The wrapped HTML email body.
		 * @param string $to       Recipient address.
		 * @param string $subject  Email subject.
		 */
		$htmlBody = $this->applyFilters( 'allfeedback:mail:body', $htmlBody, $to, $subject );

		$sent = wp_mail( $to, $subject, $htmlBody, $headers );

		if ( $sent ) {
			$this->doAction( 'allfeedback:mail:sent', $to, $subject );
		} else {
			$this->doAction( 'allfeedback:mail:failed', $to, $subject );

			$this->logger->error(
				'Failed to send email',
				[
					'to'      => $to,
					'subject' => $subject,
				]
			);
		}

		return $sent;
	}

	/**
	 * Replace `{key}` placeholders in a template string with the supplied values.
	 *
	 * @param  string                $template Template string containing `{key}` tokens.
	 * @param  array<string, string> $vars     Key-to-replacement map.
	 * @return string
	 * @since  1.0.0
	 */
	public function interpolate( string $template, array $vars ): string {
		$replacements = [];
		foreach ( $vars as $key => $value ) {
			$replacements[ '{' . $key . '}' ] = (string) $value;
		}
		return strtr( $template, $replacements );
	}

	/**
	 * Wrap raw body content in a minimal, inline-styled HTML email layout.
	 *
	 * @param  string $body    Raw body content to embed.
	 * @param  string $subject Subject used as the HTML document title.
	 * @return string Fully-rendered HTML email document.
	 * @since  1.0.0
	 */
	private function wrapInLayout( string $body, string $subject ): string {
		$siteName = esc_html( get_bloginfo( 'name' ) );
		$bodyHtml = nl2br( $body );

		return '<!DOCTYPE html>'
			. '<html lang="en">'
			. '<head>'
			. '<meta charset="UTF-8">'
			. '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
			. '<title>' . esc_html( $subject ) . '</title>'
			. '</head>'
			. '<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">'
			. '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">'
			. '<tr><td align="center">'
			. '<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">'
			. '<tr><td style="background-color:#6366f1;padding:24px 32px;">'
			. '<h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">' . $siteName . '</h1>'
			. '</td></tr>'
			. '<tr><td style="padding:32px;color:#374151;font-size:14px;line-height:1.6;">'
			. $bodyHtml
			. '</td></tr>'
			. '<tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">'
			. '<p style="margin:0;color:#9ca3af;font-size:12px;">&copy; ' . $siteName . '</p>'
			. '</td></tr>'
			. '</table>'
			. '</td></tr>'
			. '</table>'
			. '</body>'
			. '</html>';
	}
}
