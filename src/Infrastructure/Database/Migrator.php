<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Database;

use AllFeedback\Core\Constants;
use AllFeedback\Traits\Hooks;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

/**
 * Discovers, tracks, and runs database migration files.
 *
 * Migration files live in database/migrations/ and are named:
 *   NNNN_MigrationName.php  (e.g. 0001_CreateInitialTables.php)
 *
 * Ran migrations are tracked in a dedicated `wp_af_migrations` table with
 * batch numbers so groups can be rolled back together.
 *
 * @package AllFeedback\Infrastructure\Database
 * @since   1.0.0
 */
class Migrator {

	use Hooks;

	/**
	 * Absolute path to the migrations directory.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private string $migrationsPath;

	/**
	 * @since  1.0.0
	 */
	public function __construct() {
		$this->migrationsPath = Constants::path( 'database/migrations/' );
	}

	/**
	 * Ensure the migrations tracking table exists.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function ensureTable(): void {
		global $wpdb;

		$table = $this->tableName();

		if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) === $table ) {
			return;
		}

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$collate = $wpdb->has_cap( 'collation' ) ? $wpdb->get_charset_collate() : '';

		dbDelta( "CREATE TABLE {$table} (
			id        BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			name      VARCHAR(255)        NOT NULL,
			batch     BIGINT(20) UNSIGNED NOT NULL,
			ran_at    DATETIME            NOT NULL,
			PRIMARY KEY (id),
			UNIQUE KEY name (name)
		) {$collate};" );
	}

	/**
	 * Run all pending migrations in ascending order.
	 *
	 * @return string[]
	 * @since  1.0.0
	 */
	public function run(): array {
		$this->ensureTable();

		$ran     = $this->getRanNames();
		$files   = $this->discoverFiles();
		$pending = $this->filterPending( $files, $ran );

		if ( empty( $pending ) ) {
			return [];
		}

		$batch = $this->currentBatch() + 1;

		$this->doAction( 'allfeedback:migrations:before_run', $pending );

		$executed = [];

		foreach ( $pending as $file ) {
			$name = $this->nameFromFile( $file );

			$this->doAction( 'allfeedback:migration:before', $name );

			$this->resolve( $file )->up();
			$this->recordRan( $name, $batch );
			$executed[] = $name;

			$this->doAction( 'allfeedback:migration:after', $name );
		}

		$this->doAction( 'allfeedback:migrations:after_run', $executed );

		return $executed;
	}

	/**
	 * Roll back the last N batches (default: 1).
	 *
	 * @param  int $step Number of batches to roll back.
	 * @return string[]
	 * @since  1.0.0
	 */
	public function rollback( int $step = 1 ): array {
		$this->ensureTable();

		$currentBatch = $this->currentBatch();
		$targetBatch  = max( 0, $currentBatch - $step );

		global $wpdb;
		$table = $this->tableName();

		$names = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT name FROM {$table} WHERE batch > %d ORDER BY id DESC",
				$targetBatch
			)
		);

		if ( empty( $names ) ) {
			return [];
		}

		$this->doAction( 'allfeedback:migrations:before_rollback', $names );

		$rolledBack = [];
		$fileMap    = $this->fileMapByName();

		foreach ( $names as $name ) {
			if ( ! isset( $fileMap[ $name ] ) ) {
				continue;
			}

			$this->doAction( 'allfeedback:migration:before_rollback', $name );

			$this->resolve( $fileMap[ $name ] )->down();
			$this->deleteRan( $name );
			$rolledBack[] = $name;

			$this->doAction( 'allfeedback:migration:after_rollback', $name );
		}

		$this->doAction( 'allfeedback:migrations:after_rollback', $rolledBack );

		return $rolledBack;
	}

	/**
	 * Roll back ALL ran migrations, then run them all again.
	 *
	 * @return string[]
	 * @since  1.0.0
	 */
	public function refresh(): array {
		$this->reset();
		return $this->run();
	}

	/**
	 * Roll back every ran migration in reverse order.
	 *
	 * @return string[]
	 * @since  1.0.0
	 */
	public function reset(): array {
		$this->ensureTable();

		$files      = array_reverse( $this->discoverFiles() );
		$ran        = $this->getRanNames();
		$rolledBack = [];

		$this->doAction( 'allfeedback:migrations:before_rollback', $ran );

		foreach ( $files as $file ) {
			$name = $this->nameFromFile( $file );

			if ( ! in_array( $name, $ran, true ) ) {
				continue;
			}

			$this->doAction( 'allfeedback:migration:before_rollback', $name );

			$this->resolve( $file )->down();
			$this->deleteRan( $name );
			$rolledBack[] = $name;

			$this->doAction( 'allfeedback:migration:after_rollback', $name );
		}

		$this->doAction( 'allfeedback:migrations:after_rollback', $rolledBack );

		return $rolledBack;
	}

	/**
	 * Clear all ran-migration records when any of the given unprefixed table
	 * names are absent from the database.
	 *
	 * @param  string[] $tables Unprefixed table names, e.g. ['af_surveys', 'af_responses'].
	 * @return void
	 * @since  1.0.0
	 */
	public function resetIfTablesMissing( array $tables ): void {
		global $wpdb;

		foreach ( $tables as $unprefixed ) {
			$full = $wpdb->prefix . $unprefixed;
			if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $full ) ) !== $full ) {
				$this->ensureTable();
				$wpdb->query( 'DELETE FROM ' . $this->tableName() ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				return;
			}
		}
	}

	/**
	 * Return true when there are migration files that have not been run yet.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function hasPending(): bool {
		$this->ensureTable();

		return ! empty( $this->filterPending( $this->discoverFiles(), $this->getRanNames() ) );
	}

	/**
	 * Return the status of every discovered migration file.
	 *
	 * @return array<int, array{name: string, ran: bool, batch: int|null, ran_at: string|null}>
	 * @since  1.0.0
	 */
	public function status(): array {
		$this->ensureTable();

		global $wpdb;
		$table = $this->tableName();

		$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT name, batch, ran_at FROM %i', $table ), ARRAY_A ) ?: [];

		$ranMap = [];
		foreach ( $rows as $row ) {
			$ranMap[ $row['name'] ] = [ 'batch' => (int) $row['batch'], 'ran_at' => $row['ran_at'] ];
		}

		$result = [];

		foreach ( $this->discoverFiles() as $file ) {
			$name = $this->nameFromFile( $file );
			$meta = $ranMap[ $name ] ?? null;

			$result[] = [
				'name'   => $name,
				'ran'    => $meta !== null,
				'batch'  => $meta ? $meta['batch'] : null,
				'ran_at' => $meta ? $meta['ran_at'] : null,
			];
		}

		return $result;
	}

	/**
	 * Return the list of migration names that have already been run.
	 *
	 * @return string[]
	 * @since  1.0.0
	 */
	public function getRanMigrations(): array {
		return $this->getRanNames();
	}

	/**
	 * Return the fully-qualified migrations tracking table name.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	private function tableName(): string {
		global $wpdb;
		return $wpdb->prefix . 'af_migrations';
	}

	/**
	 * Return the current highest batch number (0 if the table is empty).
	 *
	 * @return int
	 * @since  1.0.0
	 */
	private function currentBatch(): int {
		global $wpdb;
		$table = $this->tableName();
		return (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COALESCE(MAX(batch), 0) FROM %i', $table ) );
	}

	/**
	 * Return just the migration names stored in the tracking table.
	 *
	 * @return string[]
	 * @since  1.0.0
	 */
	private function getRanNames(): array {
		global $wpdb;
		$table = $this->tableName();
		return $wpdb->get_col( $wpdb->prepare( 'SELECT name FROM %i', $table ) ) ?: [];
	}

	/**
	 * Insert a row into the migrations table.
	 *
	 * @param  string $name  Migration name (basename without extension).
	 * @param  int    $batch Batch number to assign.
	 * @return void
	 * @since  1.0.0
	 */
	private function recordRan( string $name, int $batch ): void {
		global $wpdb;
		$wpdb->insert(
			$this->tableName(),
			[
				'name'   => $name,
				'batch'  => $batch,
				'ran_at' => gmdate( 'Y-m-d H:i:s' ),
			],
			[ '%s', '%d', '%s' ]
		);
	}

	/**
	 * Remove a row from the migrations table.
	 *
	 * @param  string $name Migration name to remove.
	 * @return void
	 * @since  1.0.0
	 */
	private function deleteRan( string $name ): void {
		global $wpdb;
		$wpdb->delete( $this->tableName(), [ 'name' => $name ], [ '%s' ] );
	}

	/**
	 * Return files whose filename is NOT already in $ran.
	 *
	 * @param  string[] $files Absolute file paths to filter.
	 * @param  string[] $ran   Migration names already recorded as run.
	 * @return string[]
	 * @since  1.0.0
	 */
	private function filterPending( array $files, array $ran ): array {
		return array_values(
			array_filter(
				$files,
				fn( string $file ) => ! in_array( $this->nameFromFile( $file ), $ran, true )
			)
		);
	}

	/**
	 * Discover all *.php files in the migrations directory, sorted ascending.
	 *
	 * @return string[]
	 * @since  1.0.0
	 */
	private function discoverFiles(): array {
		$path  = $this->applyFilters( 'allfeedback:migrations:path', $this->migrationsPath );
		$files = glob( $path . '*.php' ) ?: [];
		sort( $files );

		return $files;
	}

	/**
	 * Build a map of migration-name → file-path for fast lookup during rollback.
	 *
	 * @return array<string, string>
	 * @since  1.0.0
	 */
	private function fileMapByName(): array {
		$map = [];
		foreach ( $this->discoverFiles() as $file ) {
			$map[ $this->nameFromFile( $file ) ] = $file;
		}
		return $map;
	}

	/**
	 * Derive the migration name (basename without extension).
	 *
	 * @param  string $filePath Absolute path to the migration file.
	 * @return string
	 * @since  1.0.0
	 */
	private function nameFromFile( string $filePath ): string {
		return pathinfo( $filePath, PATHINFO_FILENAME );
	}

	/**
	 * Instantiate the migration class from a file path.
	 *
	 * @param  string $filePath Absolute path to the migration file.
	 * @return Migration
	 * @since  1.0.0
	 */
	private function resolve( string $filePath ): Migration {
		require_once $filePath;

		$filename  = pathinfo( $filePath, PATHINFO_FILENAME );
		$className = (string) preg_replace( '/^\d+_/', '', $filename );

		/** @var class-string<Migration> */
		$fqcn = 'AllFeedback\\Database\\Migrations\\' . $className;

		if ( ! class_exists( $fqcn ) ) {
			throw new \RuntimeException( "Migration class {$fqcn} not found in {$filePath}." );
		}

		$instance = new $fqcn();

		if ( ! $instance instanceof Migration ) {
			throw new \RuntimeException( "{$fqcn} must extend Migration." );
		}

		return $instance;
	}
}
