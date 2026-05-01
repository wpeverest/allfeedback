<?php
/**
 * Migrate command.
 *
 * @package AllFeedback\CLI
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\CLI;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migrator;

/**
 * WP-CLI commands for managing AllFeedback database migrations.
 *
 * Usage:
 *   wp allfeedback migrate              — run all pending migrations
 *   wp allfeedback migrate status       — show status of every migration
 *   wp allfeedback migrate rollback     — roll back last batch
 *   wp allfeedback migrate rollback --step=2 — roll back last 2 batches
 *   wp allfeedback migrate reset        — roll back ALL migrations
 *   wp allfeedback migrate refresh      — reset then re-run all migrations
 *
 * @package AllFeedback\CLI
 * @since   1.0.0
 */
class MigrateCommand {

	/**
	 * Constructor.
	 *
	 * @param  Migrator $migrator Database migrator for running and rolling back migrations.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Migrator $migrator,
	) {}

	/**
	 * Run all pending migrations.
	 *
	 * ## EXAMPLES
	 *
	 *   wp allfeedback migrate
	 *
	 * @return void
	 * @when   after_wp_load
	 * @since  1.0.0
	 */
	public function __invoke(): void {
		$this->migrate();
	}

	/**
	 * Run all pending migrations.
	 *
	 * ## EXAMPLES
	 *
	 *   wp allfeedback migrate run
	 *
	 * @return     void
	 * @subcommand run
	 * @when       after_wp_load
	 * @since      1.0.0
	 */
	public function migrate(): void {
		$ran = $this->migrator->run();

		if ( empty( $ran ) ) {
			\WP_CLI::success( 'Nothing to migrate.' );
			return;
		}

		foreach ( $ran as $name ) {
			\WP_CLI::log( \WP_CLI::colorize( "%GMigrated:%n {$name}" ) );
		}

		\WP_CLI::success( sprintf( '%d migration(s) ran successfully.', count( $ran ) ) );
	}

	/**
	 * Show the status of all discovered migrations.
	 *
	 * ## EXAMPLES
	 *
	 *   wp allfeedback migrate status
	 *
	 * @return     void
	 * @subcommand status
	 * @when       after_wp_load
	 * @since      1.0.0
	 */
	public function status(): void {
		$rows = $this->migrator->status();

		if ( empty( $rows ) ) {
			\WP_CLI::warning( 'No migration files found.' );
			return;
		}

		$table_rows = array_map(
			function ( array $row ): array {
				return [
					'Migration' => $row['name'],
					'Ran'       => $row['ran'] ? \WP_CLI::colorize( '%GYes%n' ) : \WP_CLI::colorize( '%RNo%n' ),
					'Batch'     => $row['batch'] ?? '—',
					'Ran At'    => $row['ran_at'] ?? '—',
				];
			},
			$rows
		);

		\WP_CLI\Utils\format_items( 'table', $table_rows, [ 'Migration', 'Ran', 'Batch', 'Ran At' ] );
	}

	/**
	 * Roll back the last batch of migrations.
	 *
	 * ## OPTIONS
	 *
	 * [--step=<number>]
	 * : Number of batches to roll back. Default is 1.
	 *
	 * ## EXAMPLES
	 *
	 *   wp allfeedback migrate rollback
	 *   wp allfeedback migrate rollback --step=2
	 *
	 * @param      array<int, string>   $args      Positional arguments (unused).
	 * @param      array<string, mixed> $assoc_args Associative arguments; accepts `step`.
	 * @return     void
	 * @subcommand rollback
	 * @when       after_wp_load
	 * @since      1.0.0
	 */
	public function rollback( array $args, array $assoc_args ): void {
		$step = max( 1, (int) ( $assoc_args['step'] ?? 1 ) );

		\WP_CLI::confirm(
			sprintf( 'This will roll back the last %d batch(es). Are you sure?', $step )
		);

		$rolled_back = $this->migrator->rollback( $step );

		if ( empty( $rolled_back ) ) {
			\WP_CLI::success( 'Nothing to roll back.' );
			return;
		}

		foreach ( $rolled_back as $name ) {
			\WP_CLI::log( \WP_CLI::colorize( "%YRolled back:%n {$name}" ) );
		}

		\WP_CLI::success( sprintf( '%d migration(s) rolled back.', count( $rolled_back ) ) );
	}

	/**
	 * Roll back ALL migrations (full database reset).
	 *
	 * ## EXAMPLES
	 *
	 *   wp allfeedback migrate reset
	 *
	 * @return     void
	 * @subcommand reset
	 * @when       after_wp_load
	 * @since      1.0.0
	 */
	public function reset(): void {
		\WP_CLI::confirm( 'This will roll back ALL migrations and drop all plugin tables. Are you sure?' );

		$rolled_back = $this->migrator->reset();

		if ( empty( $rolled_back ) ) {
			\WP_CLI::success( 'Nothing to reset.' );
			return;
		}

		foreach ( $rolled_back as $name ) {
			\WP_CLI::log( \WP_CLI::colorize( "%YRolled back:%n {$name}" ) );
		}

		\WP_CLI::success( sprintf( '%d migration(s) reset.', count( $rolled_back ) ) );
	}

	/**
	 * Roll back all migrations and re-run them (fresh start with existing files).
	 *
	 * ## EXAMPLES
	 *
	 *   wp allfeedback migrate refresh
	 *
	 * @return     void
	 * @subcommand refresh
	 * @when       after_wp_load
	 * @since      1.0.0
	 */
	public function refresh(): void {
		\WP_CLI::confirm( 'This will drop and recreate all plugin tables. Are you sure?' );

		$ran = $this->migrator->refresh();

		foreach ( $ran as $name ) {
			\WP_CLI::log( \WP_CLI::colorize( "%GMigrated:%n {$name}" ) );
		}

		\WP_CLI::success( sprintf( 'Refresh complete — %d migration(s) ran.', count( $ran ) ) );
	}
}
