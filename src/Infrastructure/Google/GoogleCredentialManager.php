<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Google;

defined( 'ABSPATH' ) || exit;

/**
 * Manages Google API client credentials stored in WordPress options.
 *
 * Credentials (client_id, client_secret, etc.) are obtained from the Google
 * Cloud Console and uploaded via the plugin settings screen.  They are stored
 * in a single serialised option row and retrieved on demand.
 *
 * @since 1.0.0
 */
class GoogleCredentialManager {

	/** @since 1.0.0 */
	private const OPTION_KEY = '_allfb_google_credentials';

	/** @since 1.0.0 */
	private const REQUIRED_KEYS = [ 'client_id', 'client_secret' ];

	/**
	 * Persist sanitised Google API credentials to wp_options.
	 *
	 * @param array{client_id: string, client_secret: string, project_id?: string, auth_uri?: string, token_uri?: string} $credentials
	 * @since 1.0.0
	 */
	public function save( array $credentials ): void {
		$clean = [
			'client_id'     => sanitize_text_field( $credentials['client_id'] ),
			'client_secret' => sanitize_text_field( $credentials['client_secret'] ),
			'project_id'    => sanitize_text_field( $credentials['project_id'] ?? '' ),
			'auth_uri'      => esc_url_raw( $credentials['auth_uri'] ?? '' ),
			'token_uri'     => esc_url_raw( $credentials['token_uri'] ?? '' ),
		];

		update_option( self::OPTION_KEY, $clean, false );
	}

	/**
	 * Retrieve stored credentials, or null when none have been saved.
	 *
	 * @return array{client_id: string, client_secret: string, project_id: string, auth_uri: string, token_uri: string}|null
	 * @since 1.0.0
	 */
	public function get(): ?array {
		$stored = get_option( self::OPTION_KEY, null );

		if ( ! is_array( $stored ) || empty( $stored['client_id'] ) ) {
			return null;
		}

		return $stored;
	}

	/**
	 * Return the OAuth client ID, or an empty string when not configured.
	 *
	 * @since 1.0.0
	 */
	public function getClientId(): string {
		return $this->get()['client_id'] ?? '';
	}

	/**
	 * Return the OAuth client secret, or an empty string when not configured.
	 *
	 * @since 1.0.0
	 */
	public function getClientSecret(): string {
		return $this->get()['client_secret'] ?? '';
	}

	/**
	 * Return true when both client_id and client_secret are present.
	 *
	 * @since 1.0.0
	 */
	public function isConfigured(): bool {
		$creds = $this->get();
		return $creds !== null
			&& ! empty( $creds['client_id'] )
			&& ! empty( $creds['client_secret'] );
	}

	/**
	 * Remove stored credentials from wp_options.
	 *
	 * @since 1.0.0
	 */
	public function delete(): void {
		delete_option( self::OPTION_KEY );
	}

	/**
	 * Parse a Google credentials JSON string into a normalised array.
	 *
	 * Accepts both "web" and "installed" application JSON formats as exported
	 * from the Google Cloud Console.
	 *
	 * @param string $json Raw JSON string from the credentials file.
	 * @return array{client_id: string, client_secret: string, project_id?: string, auth_uri?: string, token_uri?: string}
	 * @throws \InvalidArgumentException When the JSON is malformed or missing required fields.
	 * @since 1.0.0
	 */
	public static function parseJson( string $json ): array {
		$data = json_decode( $json, true );

		if ( ! is_array( $data ) ) {
			throw new \InvalidArgumentException(
				esc_html__( 'Invalid JSON file.', 'all-feedback' )
			);
		}

		$credentials = $data['web'] ?? $data['installed'] ?? $data;

		foreach ( self::REQUIRED_KEYS as $key ) {
			if ( empty( $credentials[ $key ] ) ) {
				throw new \InvalidArgumentException(
					sprintf(
						/* translators: %s: Missing key name */
						esc_html__( 'Missing required field: %s', 'all-feedback' ),
						esc_html( $key )
					)
				);
			}
		}

		return $credentials;
	}
}
