<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Google;

defined( 'ABSPATH' ) || exit;

/**
 * Stores and retrieves Google OAuth tokens in WordPress user meta.
 *
 * Each token set is keyed by the WordPress user ID of the account that
 * performed the OAuth flow.  Tokens are stored individually so that a
 * partial update (e.g. refreshing an access token) does not clobber the
 * refresh token.
 *
 * @since 1.0.0
 */
class GoogleTokenManager {

	/** @since 1.0.0 */
	private const META_ACCESS_TOKEN  = '_allfb_google_access_token';

	/** @since 1.0.0 */
	private const META_REFRESH_TOKEN = '_allfb_google_refresh_token';

	/** @since 1.0.0 */
	private const META_EXPIRES_AT    = '_allfb_google_token_expires_at';

	/** @since 1.0.0 */
	private const META_EMAIL         = '_allfb_google_email';

	/**
	 * Return all stored tokens for a user, or null when none exist.
	 *
	 * @return array{access_token: string, refresh_token: string, expires_at: int, email: string}|null
	 * @since 1.0.0
	 */
	public function getTokens( int $userId ): ?array {
		$accessToken = get_user_meta( $userId, self::META_ACCESS_TOKEN, true );
		if ( empty( $accessToken ) ) {
			return null;
		}

		return [
			'access_token'  => (string) $accessToken,
			'refresh_token' => (string) get_user_meta( $userId, self::META_REFRESH_TOKEN, true ),
			'expires_at'    => (int) get_user_meta( $userId, self::META_EXPIRES_AT, true ),
			'email'         => (string) get_user_meta( $userId, self::META_EMAIL, true ),
		];
	}

	/**
	 * Persist OAuth tokens for a user.
	 *
	 * The refresh token and email are only updated when non-empty so that a
	 * token-refresh cycle does not overwrite the original refresh token.
	 *
	 * @since 1.0.0
	 */
	public function saveTokens( int $userId, string $accessToken, string $refreshToken, int $expiresAt, string $email = '' ): void {
		update_user_meta( $userId, self::META_ACCESS_TOKEN, $accessToken );
		update_user_meta( $userId, self::META_EXPIRES_AT, $expiresAt );

		if ( ! empty( $refreshToken ) ) {
			update_user_meta( $userId, self::META_REFRESH_TOKEN, $refreshToken );
		}

		if ( ! empty( $email ) ) {
			update_user_meta( $userId, self::META_EMAIL, $email );
		}
	}

	/**
	 * Remove all stored Google tokens for a user.
	 *
	 * @since 1.0.0
	 */
	public function deleteTokens( int $userId ): void {
		delete_user_meta( $userId, self::META_ACCESS_TOKEN );
		delete_user_meta( $userId, self::META_REFRESH_TOKEN );
		delete_user_meta( $userId, self::META_EXPIRES_AT );
		delete_user_meta( $userId, self::META_EMAIL );
	}

	/**
	 * Return true when the user has a stored refresh token (is connected).
	 *
	 * @since 1.0.0
	 */
	public function isConnected( int $userId ): bool {
		$tokens = $this->getTokens( $userId );
		return $tokens !== null && ! empty( $tokens['refresh_token'] );
	}

	/**
	 * Return true when the stored access token has expired or will expire within 60 seconds.
	 *
	 * @since 1.0.0
	 */
	public function isExpired( int $userId ): bool {
		$tokens = $this->getTokens( $userId );
		if ( $tokens === null ) {
			return true;
		}
		return time() >= ( $tokens['expires_at'] - 60 );
	}
}
