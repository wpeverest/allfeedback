<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Database;

use AllFeedback\Core\Constants;
use AllFeedback\Traits\Hooks;

/**
 * Class Migrator
 *
 * Discovers, tracks, and runs database migration files.
 *
 * Migration files live in database/migrations/ and are named:
 *   NNNN_MigrationName.php  (e.g. 0001_CreateInitialTables.php)
 *
 * The migration name stored in the wp_options table is the filename without
 * extension (e.g. "0001_CreateInitialTables").
 *
 * Which migrations have been run is stored in wp_options under OPTION_KEY.
 */
class Migrator {

	use Hooks;

	/** Option key used to persist the list of completed migrations. */
	private const OPTION_KEY = '_allfb_migrations';

	/** Absolute path to the migrations directory (set in constructor). */
	private string $migrationsPath;

	public function __construct() {
		$this->migrationsPath = Constants::path( 'database/migrations/' );
	}

	// ------------------------------------------------------------------
	// Public API
	// ------------------------------------------------------------------

	/**
	 * Run all pending migrations in ascending order.
	 *
	 * Fires action hooks before and after the batch, and before / after
	 * each individual migration so third-party code can react.
	 */
	public function run(): void {
		$ran     = $this->getRanMigrations();
		$files   = $this->discoverMigrationFiles();
		$pending = $this->filterPending( $files, $ran );

		if ( empty( $pending ) ) {
			return;
		}

		/** Fires before any pending migrations are executed. */
		$this->doAction( 'rmb:migrations:before_run', $pending );

		foreach ( $pending as $file ) {
			$name = $this->migrationName( $file );

			/** Fires before a single migration runs. */
			$this->doAction( 'rmb:migration:before', $name );

			$migration = $this->resolve( $file );
			$migration->up();

			$ran[] = $name;
			$this->saveRanMigrations( $ran );

			/** Fires after a single migration runs. */
			$this->doAction( 'rmb:migration:after', $name );
		}

		/** Fires after all pending migrations have executed. */
		$this->doAction( 'rmb:migrations:after_run', $pending );
	}

	/**
	 * Roll back all ran migrations in reverse order.
	 */
	public function rollback(): void {
		$ran   = $this->getRanMigrations();
		$files = array_reverse( $this->discoverMigrationFiles() );

		/** Fires before rolling back migrations. */
		$this->doAction( 'rmb:migrations:before_rollback', $ran );

		foreach ( $files as $file ) {
			$name = $this->migrationName( $file );

			if ( ! in_array( $name, $ran, true ) ) {
				continue;
			}

			/** Fires before a single migration is rolled back. */
			$this->doAction( 'rmb:migration:before_rollback', $name );

			$migration = $this->resolve( $file );
			$migration->down();

			$ran = array_values( array_diff( $ran, [ $name ] ) );
			$this->saveRanMigrations( $ran );

			/** Fires after a single migration is rolled back. */
			$this->doAction( 'rmb:migration:after_rollback', $name );
		}

		delete_option( self::OPTION_KEY );

		/** Fires after all migrations have been rolled back. */
		$this->doAction( 'rmb:migrations:after_rollback' );
	}

	/**
	 * Return true when there are migration files that have not been run yet.
	 */
	public function hasPending(): bool {
		$ran   = $this->getRanMigrations();
		$files = $this->discoverMigrationFiles();

		return ! empty( $this->filterPending( $files, $ran ) );
	}

	/**
	 * Return the list of migration names that have already been run.
	 *
	 * @return string[]
	 */
	public function getRanMigrations(): array {
		$value = get_option( self::OPTION_KEY, '[]' );
		return json_decode( (string) $value, true ) ?: [];
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Return files whose filename is NOT already in $ran.
	 *
	 * @param string[] $files All discovered migration file paths.
	 * @param string[] $ran   Names of already-run migrations.
	 * @return string[]
	 */
	private function filterPending( array $files, array $ran ): array {
		return array_values(
			array_filter(
				$files,
				fn( string $file ) => ! in_array( $this->migrationName( $file ), $ran, true )
			)
		);
	}

	/**
	 * Discover all *.php files in the migrations directory, sorted ascending.
	 *
	 * @return string[] Sorted absolute file paths.
	 */
	private function discoverMigrationFiles(): array {
		/**
		 * Filter: rmb:migrations:path
		 *
		 * Override the directory scanned for migration files.
		 *
		 * @param string $migrationsPath Absolute path to the migrations directory.
		 */
		$path = $this->applyFilters( 'rmb:migrations:path', $this->migrationsPath );

		$files = glob( $path . '*.php' ) ?: [];
		sort( $files );

		return $files;
	}

	/**
	 * Derive the migration name (the file's basename without extension).
	 *
	 * @param  string $filePath Absolute path to the migration file.
	 * @return string e.g. "0001_CreateInitialTables"
	 */
	private function migrationName( string $filePath ): string {
		return pathinfo( $filePath, PATHINFO_FILENAME );
	}

	/**
	 * Instantiate the migration class from a file path.
	 *
	 * The class must live in the namespace:
	 *   AllFeedback\Database\Migrations\<ClassName>
	 *
	 * The numeric prefix is stripped to derive the class name:
	 *   0001_CreateInitialTables → CreateInitialTables
	 *
	 * @param  string    $filePath Absolute path to the migration file.
	 * @return Migration
	 */
	private function resolve( string $filePath ): Migration {
		require_once $filePath;

		$filename  = pathinfo( $filePath, PATHINFO_FILENAME );
		$className = (string) preg_replace( '/^\d+_/', '', $filename );

		/** @var class-string<Migration> */
		$fqcn = 'AllFeedback\\Database\\Migrations\\' . $className;

		return new $fqcn();
	}

	/**
	 * Persist the list of run migrations to the database.
	 *
	 * @param string[] $migrations
	 */
	private function saveRanMigrations( array $migrations ): void {
		update_option(
			self::OPTION_KEY,
			wp_json_encode( array_values( $migrations ) ),
			false  // Do NOT auto-load this option on every page.
		);
	}
}
