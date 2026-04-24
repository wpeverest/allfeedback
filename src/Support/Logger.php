<?php

declare(strict_types=1);

namespace AllFeedback\Support;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Settings\SettingsManager;

/**
 * Class Logger
 *
 * File-based structured logger for AllFeedback.
 *
 * ── Storage ───────────────────────────────────────────────────────────────
 *
 * One log file per day, stored in the WordPress uploads directory:
 *   {uploads}/allfeedback/logs/allfeedback-{Y-m-d}.log
 *
 * The directory is created on plugin activation (CoreServiceProvider).
 * Direct file access is blocked by .htaccess (deny from all) and index.php.
 * Log content is served exclusively through GET /all-feedback/v1/logs/{id}.
 *
 * ── Settings ──────────────────────────────────────────────────────────────
 *
 * All behaviour is controlled by advanced.logging.*:
 *   enabled        — master switch for debug/info/warning/error writes
 *   level          — minimum severity: error | warning | info | debug
 *   retention_days — files older than N days are pruned on each write
 *
 * FATAL errors are always captured regardless of the enabled setting.
 * A fatal inside the plugin should always be visible in the log viewer.
 *
 * ── Entry format ──────────────────────────────────────────────────────────
 *
 *   [2026-04-13T10:30:00+00:00] [ERROR] Message {"key": "value"}
 *   [2026-04-13T10:30:00+00:00] [FATAL] Uncaught TypeError … {"file":"…","line":42}
 *
 * ── Usage ─────────────────────────────────────────────────────────────────
 *
 *   $logger->error( 'Survey submission failed.', [ 'survey_id' => 1 ] );
 *   $logger->warning( 'Deprecated field used.', [ 'field' => 'foo' ] );
 *   $logger->info( 'Settings updated.', [ 'page' => 'general' ] );
 *   $logger->debug( 'Pipeline context.', [ 'step' => 'validate' ] );
 *
 *   // Called once from CoreServiceProvider::boot():
 *   $logger->registerShutdownHandler();
 *
 * @package AllFeedback\Support
 * @since   1.0.0
 */
class Logger {

	/**
	 * Severity map used to compare levels numerically.
	 * Higher number = more severe.
	 *
	 * @var array<string, int>
	 * @since 1.0.0
	 */
	private const LEVELS = [
		'debug'   => 100,
		'info'    => 200,
		'warning' => 400,
		'error'   => 500,
	];

	/**
	 * PHP error types that are considered fatal and always logged.
	 *
	 * These errors halt execution — they cannot be caught by a try/catch.
	 * E_RECOVERABLE_ERROR is included because it surfaces as a fatal in
	 * PHP 8.x when a type constraint is violated.
	 *
	 * @var int[]
	 * @since 1.0.0
	 */
	private const FATAL_TYPES = [
		E_ERROR,
		E_PARSE,
		E_CORE_ERROR,
		E_COMPILE_ERROR,
		E_USER_ERROR,
		E_RECOVERABLE_ERROR,
	];

	/**
	 * @param  SettingsManager $settings Plugin settings (for enabled, level, retention_days).
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SettingsManager $settings,
	) {}

	/**
	 * Log a DEBUG-level message.
	 *
	 * @param  string               $message Human-readable message.
	 * @param  array<string, mixed> $context Additional key→value context.
	 * @return void
	 * @since  1.0.0
	 */
	public function debug( string $message, array $context = [] ): void {
		$this->log( 'debug', $message, $context );
	}

	/**
	 * Log an INFO-level message.
	 *
	 * @param  string               $message Human-readable message.
	 * @param  array<string, mixed> $context Additional key→value context.
	 * @return void
	 * @since  1.0.0
	 */
	public function info( string $message, array $context = [] ): void {
		$this->log( 'info', $message, $context );
	}

	/**
	 * Log a WARNING-level message.
	 *
	 * @param  string               $message Human-readable message.
	 * @param  array<string, mixed> $context Additional key→value context.
	 * @return void
	 * @since  1.0.0
	 */
	public function warning( string $message, array $context = [] ): void {
		$this->log( 'warning', $message, $context );
	}

	/**
	 * Log an ERROR-level message.
	 *
	 * @param  string               $message Human-readable message.
	 * @param  array<string, mixed> $context Additional key→value context.
	 * @return void
	 * @since  1.0.0
	 */
	public function error( string $message, array $context = [] ): void {
		$this->log( 'error', $message, $context );
	}

	/**
	 * Register a PHP shutdown function that captures fatal errors.
	 *
	 * Must be called once from CoreServiceProvider::boot(). Fatals are
	 * written unconditionally — the enabled setting does not apply because
	 * a crash inside the plugin should always appear in the log viewer.
	 *
	 * Only errors whose file path contains the plugin directory are captured —
	 * fatals from WordPress core or other plugins are not our responsibility.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerShutdownHandler(): void {
		$pluginDir = defined( 'ABSPATH' )
			? ( realpath( WP_PLUGIN_DIR . '/allfeedback' ) ?: '' )
			: '';

		register_shutdown_function(
			function () use ( $pluginDir ): void {
				$error = error_get_last();

				if ( $error === null ) {
					return;
				}

				if ( ! in_array( $error['type'], self::FATAL_TYPES, true ) ) {
					return;
				}

				if ( $pluginDir !== '' && strpos( $error['file'], $pluginDir ) === false ) {
					return;
				}

				$this->writeFatal( $error['message'], [
					'file' => $error['file'],
					'line' => $error['line'],
					'type' => $error['type'],
				] );
			}
		);
	}

	/**
	 * Absolute filesystem path to the log directory (no trailing slash).
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function logDir(): string {
		return wp_upload_dir()['basedir'] . '/allfeedback/logs';
	}

	/**
	 * Create the log directory and protect it from direct HTTP access.
	 *
	 * Safe to call multiple times — is a no-op if already set up.
	 *
	 * @return bool True if the directory exists and is writable.
	 * @since  1.0.0
	 */
	public function ensureDirectory(): bool {
		$dir = $this->logDir();

		if ( ! wp_mkdir_p( $dir ) ) {
			return false;
		}

		$htaccess = $dir . '/.htaccess';
		if ( ! file_exists( $htaccess ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $htaccess, "deny from all\n" );
		}

		$index = $dir . '/index.php';
		if ( ! file_exists( $index ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $index, "<?php\n// Silence is golden.\n" );
		}

		return is_writable( $dir );
	}

	/**
	 * Check whether logging is switched on via settings.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	private function isEnabled(): bool {
		return (bool) $this->settings->get( 'advanced.logging.enabled' );
	}

	/**
	 * Check whether `$level` meets the minimum configured threshold.
	 *
	 * @param  string $level One of: `debug` | `info` | `warning` | `error`.
	 * @return bool
	 * @since  1.0.0
	 */
	private function meetsThreshold( string $level ): bool {
		$threshold = (string) ( $this->settings->get( 'advanced.logging.level' ) ?? 'error' );
		return ( self::LEVELS[ $level ] ?? 0 ) >= ( self::LEVELS[ $threshold ] ?? 0 );
	}

	/**
	 * Return the absolute path to today's log file.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	private function currentLogFile(): string {
		return $this->logDir() . '/allfeedback-' . gmdate( 'Y-m-d' ) . '.log';
	}

	/**
	 * Format a single log entry line.
	 *
	 * Example: `[2026-04-13T10:30:00+00:00] [ERROR] Message {"key":"value"}`
	 *
	 * @param  string               $level   Severity label.
	 * @param  string               $message Human-readable message.
	 * @param  array<string, mixed> $context Key→value context pairs.
	 * @return string
	 * @since  1.0.0
	 */
	private function format( string $level, string $message, array $context ): string {
		$entry = sprintf( '[%s] [%s] %s', gmdate( 'c' ), strtoupper( $level ), $message );

		if ( ! empty( $context ) ) {
			$entry .= ' ' . wp_json_encode( $context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		}

		return $entry;
	}

	/**
	 * Write a log entry to today's log file when logging is enabled.
	 *
	 * @param  string               $level   Severity label.
	 * @param  string               $message Human-readable message.
	 * @param  array<string, mixed> $context Key→value context pairs.
	 * @return void
	 * @since  1.0.0
	 */
	private function log( string $level, string $message, array $context ): void {
		if ( ! $this->isEnabled() ) {
			return;
		}

		$this->write( $level, $message, $context );
		$this->pruneOldLogs();
	}

	/**
	 * Write a FATAL entry unconditionally — bypasses the enabled setting.
	 *
	 * Used exclusively by the shutdown handler. Does not prune old logs
	 * because shutdown functions run after normal PHP execution has ended
	 * and other resources may already be released.
	 *
	 * @param  string               $message Human-readable message.
	 * @param  array<string, mixed> $context Key→value context pairs.
	 * @return void
	 * @since  1.0.0
	 */
	private function writeFatal( string $message, array $context ): void {
		$this->write( 'fatal', $message, $context );
	}

	/**
	 * Low-level file write — no guards, no pruning.
	 *
	 * Called by both `log()` and `writeFatal()`.
	 *
	 * @param  string               $level   Severity label.
	 * @param  string               $message Human-readable message.
	 * @param  array<string, mixed> $context Key→value context pairs.
	 * @return void
	 * @since  1.0.0
	 */
	private function write( string $level, string $message, array $context ): void {
		$dir = $this->logDir();

		if ( ! wp_mkdir_p( $dir ) ) {
			return;
		}

		$entry = $this->format( $level, $message, $context );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		file_put_contents( $this->currentLogFile(), $entry . PHP_EOL, FILE_APPEND | LOCK_EX );
	}

	/**
	 * Delete log files older than the configured retention period.
	 *
	 * Called after every normal write. Skipped in `writeFatal()` because
	 * shutdown functions should do as little as possible.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function pruneOldLogs(): void {
		$days = (int) ( $this->settings->get( 'advanced.logging.retention_days' ) ?? 30 );

		if ( $days <= 0 ) {
			return;
		}

		$cutoff = strtotime( "-{$days} days" );
		$files  = glob( $this->logDir() . '/allfeedback-*.log' ) ?: [];

		foreach ( $files as $file ) {
			if ( is_file( $file ) && filemtime( $file ) < $cutoff ) {
				wp_delete_file( $file );
			}
		}
	}
}
