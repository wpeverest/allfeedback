<?php
/**
 * Mailer.
 *
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */

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
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */
class Mailer {

	use Hooks;

	/**
	 * Constructor.
	 *
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
	 * From name, From address, and optional Reply-To are resolved from plugin
	 * settings, falling back to the site title and WordPress admin email. The
	 * body is wrapped in an HTML layout before dispatch.
	 *
	 * @param  string   $to      Recipient email address.
	 * @param  string   $subject Email subject line.
	 * @param  string   $body    Plain text or partial HTML body content.
	 * @param  string[] $headers Additional raw email headers.
	 * @return bool True when wp_mail() reports success.
	 * @since  1.0.0
	 */
	public function send( string $to, string $subject, string $body, array $headers = [] ): bool {
		$from_name_setting  = $this->settings->get( 'email.delivery.from_name' );
		$sender_name        = sanitize_text_field(
			(string) ( $from_name_setting !== null && $from_name_setting !== '' ? $from_name_setting : get_bloginfo( 'name' ) )
		);
		$from_email_setting = $this->settings->get( 'email.delivery.from_email' );
		$sender_email       = sanitize_email(
			(string) ( $from_email_setting !== null && $from_email_setting !== '' ? $from_email_setting : get_option( 'admin_email' ) )
		);
		$reply_to_setting   = $this->settings->get( 'email.delivery.reply_to' );
		$reply_to           = sanitize_email(
			(string) ( $reply_to_setting !== null && $reply_to_setting !== '' ? $reply_to_setting : '' )
		);

		$headers[] = 'Content-Type: text/html; charset=UTF-8';
		$headers[] = sprintf( 'From: %s <%s>', $sender_name, $sender_email );

		if ( $reply_to !== '' ) {
			$headers[] = 'Reply-To: ' . $reply_to;
		}

		$headers   = (array) $this->applyFilters( 'allfeedback:mail:headers', $headers, $to, $subject );
		$html_body = $this->wrapInLayout( $body, $subject );
		$html_body = (string) $this->applyFilters( 'allfeedback:mail:body', $html_body, $to, $subject );

		$sent = wp_mail( $to, $subject, $html_body, $headers );

		if ( $sent ) {
			$this->doAction( 'allfeedback:mail:sent', $to, $subject );
		} else {
			$this->doAction( 'allfeedback:mail:failed', $to, $subject );
			$this->logger->error(
				'Failed to send email',
				[
					'to' => $to,
					'subject' => $subject,
				]
			);
		}

		return $sent;
	}

	/**
	 * Replace `{key}` placeholders in a template string.
	 *
	 * @param  string                $template String containing `{key}` tokens.
	 * @param  array<string, string> $vars     Token → replacement map.
	 * @return string
	 * @since  1.0.0
	 */
	public function interpolate( string $template, array $vars ): string {
		$map = [];
		foreach ( $vars as $key => $value ) {
			$map[ '{' . $key . '}' ] = (string) $value;
		}
		return strtr( $template, $map );
	}

	/**
	 * Wrap body content in a minimal inline-styled HTML email layout.
	 *
	 * The header strip colour is filterable via `allfeedback:mail:brand_color`
	 * so Pro add-ons or site owners can white-label the emails without touching
	 * this class.
	 *
	 * @param  string $body    Raw body content to embed (nl2br applied automatically).
	 * @param  string $subject Used as the HTML document title.
	 * @return string Fully-rendered HTML email document.
	 * @since  1.0.0
	 */
	private function wrapInLayout( string $body, string $subject ): string {
		$site_name   = esc_html( get_bloginfo( 'name' ) );
		$brand_color = (string) $this->applyFilters( 'allfeedback:mail:brand_color', '#6366f1' );
		$body_html   = nl2br( $body );

		return '<!DOCTYPE html>'
			. '<html lang="' . esc_attr( get_bloginfo( 'language' ) ) . '">'
			. '<head>'
			. '<meta charset="UTF-8">'
			. '<meta name="viewport" content="width=device-width,initial-scale=1">'
			. '<title>' . esc_html( $subject ) . '</title>'
			. '</head>'
			. '<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">'
			. '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">'
			. '<tr><td align="center">'
			. '<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">'
			. '<tr><td style="background-color:' . esc_attr( $brand_color ) . ';padding:20px 32px;">'
			. '<h1 style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">' . $site_name . '</h1>'
			. '</td></tr>'
			. '<tr><td style="padding:32px;color:#374151;font-size:14px;line-height:1.6;">'
			. $body_html
			. '</td></tr>'
			. '<tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;">'
			. '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
			. '<td style="color:#9ca3af;font-size:12px;">&copy; ' . $site_name . '</td>'
			. '</tr></table>'
			. '</td></tr>'
			. '</table>'
			. '</td></tr>'
			. '</table>'
			. '</body>'
			. '</html>';
	}
}
