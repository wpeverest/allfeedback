<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Google;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Support\Logger;
use Google\Client as GoogleClient;
use Google\Service\Oauth2;

/**
 * Handles the Google OAuth 2.0 flow: auth URL generation, code exchange,
 * and access-token refresh.
 *
 * Tokens are stored via GoogleTokenManager after a successful exchange or
 * refresh.  Use getValidAccessToken() to obtain a ready-to-use token that
 * is automatically refreshed when expired.
 *
 * @since 1.0.0
 */
class GoogleOAuthClient {

	/** @since 1.0.0 */
	private const SCOPES = [
		'https://www.googleapis.com/auth/calendar.events',
		'https://www.googleapis.com/auth/userinfo.email',
	];

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly GoogleCredentialManager $credentialManager,
		private readonly GoogleTokenManager $tokenManager,
		private readonly Logger $logger,
	) {}

	/**
	 * Build and return the Google OAuth authorisation URL.
	 *
	 * @param string $redirectUri URL Google should redirect to after consent.
	 * @param string $state       Optional CSRF state token.
	 * @since 1.0.0
	 */
	public function getAuthUrl( string $redirectUri, string $state = '' ): string {
		$client = $this->createGoogleClient( $redirectUri, $state );
		return $client->createAuthUrl();
	}

	/**
	 * Exchange an authorisation code for tokens and persist them.
	 *
	 * @param string $code        Authorisation code received from Google.
	 * @param string $redirectUri Must match the URI used when generating the auth URL.
	 * @param int    $userId      WordPress user ID to associate the tokens with.
	 * @return array{access_token: string, refresh_token: string, expires_at: int, email: string}
	 * @throws \RuntimeException On API failure or invalid response.
	 * @since 1.0.0
	 */
	public function exchangeCode( string $code, string $redirectUri, int $userId ): array {
		$client = $this->createGoogleClient( $redirectUri );

		try {
			$creds = $client->fetchAccessTokenWithAuthCode( $code );
		} catch ( \Exception $e ) {
			$this->logger->error( 'Google OAuth code exchange failed', [ 'error' => $e->getMessage() ] );
			throw new \RuntimeException( esc_html__( 'Failed to connect to Google: ', 'all-feedback' ) . esc_html( $e->getMessage() ) );
		}

		if ( ! is_array( $creds ) || empty( $creds['access_token'] ) ) {
			$errorDescription = $creds['error_description'] ?? $creds['error'] ?? __( 'Invalid response from Google.', 'all-feedback' );
			$this->logger->error( 'Google OAuth invalid token response', [ 'body' => $creds ] );
			throw new \RuntimeException( esc_html( (string) $errorDescription ) );
		}

		$expiresAt = ( $creds['created'] ?? time() ) + ( (int) ( $creds['expires_in'] ?? 3600 ) );
		$email     = $this->fetchUserEmail( $creds['access_token'] );

		$this->tokenManager->saveTokens(
			$userId,
			$creds['access_token'],
			$creds['refresh_token'] ?? '',
			$expiresAt,
			$email
		);

		return [
			'access_token'  => $creds['access_token'],
			'refresh_token' => $creds['refresh_token'] ?? '',
			'expires_at'    => $expiresAt,
			'email'         => $email,
		];
	}

	/**
	 * Use the stored refresh token to obtain a new access token.
	 *
	 * @param int $userId WordPress user ID whose tokens should be refreshed.
	 * @return string The new access token.
	 * @throws \RuntimeException When no refresh token is available or the refresh fails.
	 * @since 1.0.0
	 */
	public function refreshAccessToken( int $userId ): string {
		$tokens = $this->tokenManager->getTokens( $userId );
		if ( ! $tokens || empty( $tokens['refresh_token'] ) ) {
			throw new \RuntimeException( esc_html__( 'No refresh token available.', 'all-feedback' ) );
		}

		$client = $this->createGoogleClient( '' );
		$client->setAccessToken( $this->tokensToGoogleFormat( $tokens ) );

		try {
			$creds = $client->fetchAccessTokenWithRefreshToken();
		} catch ( \Exception $e ) {
			$this->logger->error( 'Google token refresh failed', [ 'error' => $e->getMessage() ] );
			$this->tokenManager->deleteTokens( $userId );
			throw new \RuntimeException( esc_html__( 'Google token refresh failed. Please reconnect.', 'all-feedback' ) );
		}

		if ( ! is_array( $creds ) || empty( $creds['access_token'] ) ) {
			$this->logger->error( 'Google token refresh invalid response', [ 'body' => $creds ] );
			$this->tokenManager->deleteTokens( $userId );
			throw new \RuntimeException( esc_html__( 'Google token refresh failed. Please reconnect.', 'all-feedback' ) );
		}

		$expiresAt = ( $creds['created'] ?? time() ) + ( (int) ( $creds['expires_in'] ?? 3600 ) );

		$this->tokenManager->saveTokens(
			$userId,
			$creds['access_token'],
			$creds['refresh_token'] ?? $tokens['refresh_token'],
			$expiresAt,
			$tokens['email']
		);

		return $creds['access_token'];
	}

	/**
	 * Return a valid access token for the user, refreshing it when expired.
	 *
	 * Returns null when the user is not connected or the refresh fails.
	 *
	 * @since 1.0.0
	 */
	public function getValidAccessToken( int $userId ): ?string {
		if ( ! $this->tokenManager->isConnected( $userId ) ) {
			return null;
		}

		if ( $this->tokenManager->isExpired( $userId ) ) {
			try {
				return $this->refreshAccessToken( $userId );
			} catch ( \RuntimeException $e ) {
				$this->logger->error( 'Could not obtain valid Google token', [ 'user_id' => $userId ] );
				return null;
			}
		}

		$tokens = $this->tokenManager->getTokens( $userId );
		return $tokens['access_token'] ?? null;
	}

	/**
	 * Return true when Google API credentials are configured.
	 *
	 * @since 1.0.0
	 */
	public function isConfigured(): bool {
		return $this->credentialManager->isConfigured();
	}

	/**
	 * Build a configured Google_Client instance.
	 *
	 * @since 1.0.0
	 */
	private function createGoogleClient( string $redirectUri = '', string $state = '' ): GoogleClient {
		$client = new GoogleClient();
		$client->setClientId( $this->credentialManager->getClientId() );
		$client->setClientSecret( $this->credentialManager->getClientSecret() );
		$client->setScopes( self::SCOPES );
		$client->setAccessType( 'offline' );
		$client->setPrompt( 'consent' );

		if ( $redirectUri !== '' ) {
			$client->setRedirectUri( $redirectUri );
		}
		if ( $state !== '' ) {
			$client->setState( $state );
		}

		return $client;
	}

	/**
	 * Convert stored tokens to the format expected by the Google Client library.
	 *
	 * @param array{access_token: string, refresh_token: string, expires_at: int} $tokens
	 * @return array{access_token: string, refresh_token: string, created: int, expires_in: int}
	 * @since 1.0.0
	 */
	private function tokensToGoogleFormat( array $tokens ): array {
		$expiresIn = 3600;
		$created   = $tokens['expires_at'] - $expiresIn;

		return [
			'access_token'  => $tokens['access_token'],
			'refresh_token' => $tokens['refresh_token'],
			'created'       => $created,
			'expires_in'    => $expiresIn,
		];
	}

	/**
	 * Fetch the email address associated with a freshly obtained access token.
	 *
	 * @since 1.0.0
	 */
	private function fetchUserEmail( string $accessToken ): string {
		$client = $this->createGoogleClient();
		$client->setAccessToken(
			[
				'access_token' => $accessToken,
				'created'      => time(),
				'expires_in'   => 3600,
			]
		);

		$service = new Oauth2( $client );

		try {
			$userInfo = $service->userinfo->get();
			return $userInfo->getEmail() ?? '';
		} catch ( \Exception $e ) {
			$this->logger->error( 'Google userinfo failed', [ 'error' => $e->getMessage() ] );
			return '';
		}
	}
}
