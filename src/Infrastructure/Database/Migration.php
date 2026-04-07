<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Database;

/**
 * Abstract class Migration
 *
 * All database migrations extend this class.
 * Concrete migrations must implement:
 *
 *   up()   — Apply the migration (CREATE TABLE, ALTER TABLE, …).
 *   down() — Roll back the migration (DROP TABLE, …).
 *
 * Helper methods (table(), charsetCollate(), dbDelta()) keep the concrete
 * classes short and avoid repeating boilerplate.
 *
 * Naming convention for migration files:
 *   database/migrations/0001_CreateInitialTables.php
 *   database/migrations/0002_AddIndexToSomething.php
 *
 * The Migrator resolves the PHP class name by stripping the numeric prefix:
 *   0001_CreateInitialTables → CreateInitialTables
 *   Fully-qualified: AllFeedback\Database\Migrations\CreateInitialTables
 */
abstract class Migration {

	/**
	 * Apply the migration.
	 * Called by Migrator::run() for pending migrations.
	 */
	abstract public function up(): void;

	/**
	 * Roll back the migration.
	 * Called by Migrator::rollback() in reverse order.
	 */
	abstract public function down(): void;

	// ------------------------------------------------------------------
	// Helpers available to concrete migrations
	// ------------------------------------------------------------------

	/**
	 * Return the fully-qualified table name with the WordPress prefix.
	 *
	 * @param  string $name Raw table name, e.g. 'allfb_items'.
	 * @return string       Prefixed table name, e.g. 'wp_allfb_items'.
	 */
	protected function table( string $name ): string {
		global $wpdb;
		return $wpdb->prefix . $name;
	}

	/**
	 * Return the DB charset + collation clause, e.g.
	 * "DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci".
	 */
	protected function charsetCollate(): string {
		global $wpdb;
		return $wpdb->get_charset_collate();
	}

	/**
	 * Run a CREATE / ALTER TABLE statement through WordPress's dbDelta().
	 *
	 * dbDelta() is smart enough to only apply changes that are not yet in the
	 * database, so it is safe to call it multiple times with the same schema.
	 *
	 * @param string $sql The SQL statement(s) to execute.
	 */
	protected function dbDelta( string $sql ): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}
}
