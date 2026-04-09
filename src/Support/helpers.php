<?php

declare(strict_types=1);

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Plugin;
use AllFeedback\Support\Logger;

/**
 * Global helper functions for AllFeedback.
 *
 * Each function is guarded with function_exists() so the file can be included
 * multiple times without fatal errors (e.g. in test bootstraps).
 *
 * @package AllFeedback
 * @since   1.0.0
 */

if ( ! function_exists( 'allfeedback_get_plugin_instance' ) ) {
	/**
	 * Return the main AllFeedback plugin singleton.
	 *
	 * @return Plugin
	 * @since  1.0.0
	 */
	function allfeedback_get_plugin_instance(): Plugin {
		return Plugin::getInstance();
	}
}

if ( ! function_exists( 'allfeedback_get_setting' ) ) {
	/**
	 * Retrieve a single plugin setting by key.
	 *
	 * Delegates to SettingsManager::get() so the call respects the merged
	 * defaults-plus-stored-values logic defined there.
	 *
	 * @param  string $key     The setting key, e.g. 'email_notifications'.
	 * @param  mixed  $default Value returned when the key is not found.
	 * @return mixed           The setting value, or $default.
	 * @since  1.0.0
	 */
	function allfeedback_get_setting( string $key, mixed $default = null ): mixed {
		static $manager = null;

		if ( null === $manager ) {
			$manager = allfeedback_get_plugin_instance()->getContainer()->get( SettingsManager::class );
		}

		$value = $manager->get( $key );

		return $value !== null ? $value : $default;
	}
}

if ( ! function_exists( 'allfeedback_log' ) ) {
	/**
	 * Write a message to the AllFeedback logger.
	 *
	 * Supported levels: 'debug', 'info', 'warning', 'error'.
	 * An unrecognised level falls back to 'debug'.
	 *
	 * @param string $message The message to log.
	 * @param string $level   Severity level — 'debug' | 'info' | 'warning' | 'error'.
	 * @since 1.0.0
	 */
	function allfeedback_log( string $message, string $level = 'debug' ): void {
		static $logger = null;

		if ( null === $logger ) {
			$logger = allfeedback_get_plugin_instance()->getContainer()->get( Logger::class );
		}

		match ( $level ) {
			'info'    => $logger->info( $message ),
			'warning' => $logger->warning( $message ),
			'error'   => $logger->error( $message ),
			default   => $logger->debug( $message ),
		};
	}
}

if ( ! function_exists( 'allfeedback_get_survey_embed_url' ) ) {
	/**
	 * Return the public frontend embed URL for a given survey.
	 *
	 * The URL is built from the WordPress home URL so it works in both
	 * sub-directory and sub-domain WordPress installations.
	 *
	 * Example output: https://example.com/?allfb_survey=42
	 *
	 * @param  int    $surveyId The survey's primary-key ID.
	 * @return string           Fully-qualified embed URL.
	 * @since  1.0.0
	 */
	function allfeedback_get_survey_embed_url( int $surveyId ): string {
		return add_query_arg( 'allfb_survey', $surveyId, home_url( '/' ) );
	}
}
