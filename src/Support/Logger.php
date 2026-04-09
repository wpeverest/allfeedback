<?php

declare(strict_types=1);

namespace AllFeedback\Support;

use AllFeedback\Core\Constants;

/**
 * Class Logger
 *
 * Thin wrapper around PHP's error_log / WP debug log.
 * Writes to the standard WP debug log when WP_DEBUG_LOG is enabled.
 *
 * Usage:
 *   $logger->debug( 'Useful context', [ 'key' => 'value' ] );
 *   $logger->warning( 'Something unexpected happened.' );
 *   $logger->error( 'Critical failure!', [ 'exception' => $e->getMessage() ] );
 */
class Logger {

	/**
	 * Log a DEBUG-level message. Only written when WP_DEBUG is true.
	 *
	 * @param string               $message Human-readable message.
	 * @param array<string, mixed> $context Additional key→value context.
	 */
	public function debug( string $message, array $context = [] ): void {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			$this->log( 'DEBUG', $message, $context );
		}
	}

	/**
	 * Log an INFO-level message.
	 *
	 * @param string               $message Human-readable message.
	 * @param array<string, mixed> $context Additional key→value context.
	 */
	public function info( string $message, array $context = [] ): void {
		$this->log( 'INFO', $message, $context );
	}

	/**
	 * Log a WARNING-level message.
	 *
	 * @param string               $message Human-readable message.
	 * @param array<string, mixed> $context Additional key→value context.
	 */
	public function warning( string $message, array $context = [] ): void {
		$this->log( 'WARNING', $message, $context );
	}

	/**
	 * Log an ERROR-level message.
	 *
	 * @param string               $message Human-readable message.
	 * @param array<string, mixed> $context Additional key→value context.
	 */
	public function error( string $message, array $context = [] ): void {
		$this->log( 'ERROR', $message, $context );
	}

	// ------------------------------------------------------------------
	// Internal
	// ------------------------------------------------------------------

	/**
	 * Format and write a log entry.
	 *
	 * @param string               $level   Severity label.
	 * @param string               $message Human-readable message.
	 * @param array<string, mixed> $context Key→value pairs to append.
	 */
	private function log( string $level, string $message, array $context = [] ): void {
		$prefix = sprintf( '[AllFeedback %s] [v%s] ', $level, Constants::VERSION );
		$entry  = $prefix . $message;

		if ( ! empty( $context ) ) {
			$entry .= ' ' . wp_json_encode( $context );
		}

		// error_log() writes to the file defined by WP_DEBUG_LOG when
		// WP_DEBUG_LOG is set to true or to a file path.
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		error_log( $entry );
	}
}
