<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

use AllFeedback\Infrastructure\Database\Migration;

/**
 * Migration: CreateInitialTables
 *
 * Creates the initial database table(s) required by the plugin.
 *
 * To add a new migration:
 *   1. Copy this file to 0002_YourMigrationName.php.
 *   2. Rename the class to match (YourMigrationName).
 *   3. Implement up() / down() with your schema changes.
 *
 * Table naming convention: {prefix}allfb_{table}
 * e.g. wp_allfb_items
 */
class CreateInitialTables extends Migration {

	/**
	 * Apply the migration — create all initial tables.
	 * Uses dbDelta() which is safe to run on an existing schema.
	 */
	public function up(): void {
		$charset = $this->charsetCollate();

		// ------------------------------------------------------------------
		// allfb_items  (sample table — replace with your real schema)
		// ------------------------------------------------------------------
		$this->dbDelta(
			"CREATE TABLE IF NOT EXISTS {$this->table( 'allfb_items' )} (
			id          bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id     bigint(20) unsigned NOT NULL,
			title       varchar(255)        NOT NULL DEFAULT '',
			status      varchar(20)         NOT NULL DEFAULT 'active',
			meta        longtext                     DEFAULT NULL,
			created_at  datetime            NOT NULL,
			updated_at  datetime                     DEFAULT NULL,
			PRIMARY KEY  (id),
			KEY user_id  (user_id),
			KEY status   (status)
		) {$charset};"
		);

		// Add more CREATE TABLE statements here for additional tables.
	}

	/**
	 * Roll back the migration — drop all tables created in up().
	 *
	 * WARNING: this permanently destroys data.
	 * Only called by Migrator::rollback() which is never triggered automatically.
	 */
	public function down(): void {
		global $wpdb;

		$tables = [
			$this->table( 'allfb_items' ),
			// List additional tables in reverse order (child before parent).
		];

		foreach ( $tables as $table ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$wpdb->query( "DROP TABLE IF EXISTS {$table}" );
		}
	}
}
