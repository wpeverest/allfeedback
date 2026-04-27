<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Database;

/**
 * Abstract base class for all database migrations.
 *
 * Concrete migrations must implement:
 *   - `up()`   — Apply the migration (CREATE TABLE, ALTER TABLE, etc.).
 *   - `down()` — Roll back the migration (DROP TABLE, etc.).
 *
 * Helper methods (`table()`, `charsetCollate()`, `dbDelta()`) keep concrete
 * classes short and avoid repeating boilerplate.
 *
 * Naming convention for migration files:
 *   `database/migrations/0001_CreateInitialTables.php`
 *   `database/migrations/0002_AddIndexToSomething.php`
 *
 * The `Migrator` resolves the PHP class name by stripping the numeric prefix:
 *   `0001_CreateInitialTables` → `AllFeedback\Database\Migrations\CreateInitialTables`
 *
 * @package AllFeedback\Infrastructure\Database
 * @since   1.0.0
 */
abstract class Migration {

	/**
	 * Apply the migration.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	abstract public function up(): void;

	/**
	 * Roll back the migration.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	abstract public function down(): void;

	/**
	 * Return the fully-qualified table name with the WordPress prefix.
	 *
	 * @param  string $name Raw table name, e.g. `'af_surveys'`.
	 * @return string       Prefixed table name, e.g. `'wp_af_surveys'`.
	 * @since  1.0.0
	 */
	protected function table( string $name ): string {
		global $wpdb;
		return $wpdb->prefix . $name;
	}

	/**
	 * Return the DB charset and collation clause.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	protected function charsetCollate(): string {
		global $wpdb;
		return $wpdb->get_charset_collate();
	}

	/**
	 * Run a CREATE/ALTER TABLE statement through WordPress's `dbDelta()`.
	 *
	 * @param  string $sql The SQL statement(s) to execute.
	 * @return void
	 * @since  1.0.0
	 */
	protected function dbDelta( string $sql ): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}
}
