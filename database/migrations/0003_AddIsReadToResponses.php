<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migration;

/**
 * Migration: AddIsReadToResponses
 *
 * Adds the `is_read` column to the af_responses table so that admin users
 * can track which responses have been reviewed.
 *
 * Column definition:
 *   is_read TINYINT(1) NOT NULL DEFAULT 0
 *
 * Also adds an index on `is_read` to support efficient unread-count queries
 * used by the admin sidebar badge.
 *
 * @since 1.0.0
 */
class AddIsReadToResponses extends Migration {

	/**
	 * Apply the migration.
	 *
	 * @since 1.0.0
	 */
	public function up(): void {
		global $wpdb;

		$table = $this->table( 'af_responses' );

		// Add the column only if it does not already exist.
		$exists = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare(
				'SHOW COLUMNS FROM `%1s` LIKE %s',
				$table,
				'is_read'
			)
		);

		if ( empty( $exists ) ) {
			$wpdb->query( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
				"ALTER TABLE `{$table}` ADD COLUMN `is_read` TINYINT(1) NOT NULL DEFAULT 0 AFTER `consent_given`" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			);
		}

		// Add index on is_read for fast unread-count queries.
		if ( ! $this->indexExists( $table, 'is_read' ) ) {
			$wpdb->query( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
				"ALTER TABLE `{$table}` ADD INDEX `is_read` (`is_read`)" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			);
		}
	}

	/**
	 * Roll back the migration.
	 *
	 * @since 1.0.0
	 */
	public function down(): void {
		global $wpdb;

		$table = $this->table( 'af_responses' );

		if ( $this->indexExists( $table, 'is_read' ) ) {
			$wpdb->query( "ALTER TABLE `{$table}` DROP INDEX `is_read`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
		}

		$wpdb->query( "ALTER TABLE `{$table}` DROP COLUMN `is_read`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
	}

	/**
	 * Return true when a named index already exists on the given table.
	 *
	 * @param  string $table     Fully-qualified (prefixed) table name.
	 * @param  string $indexName Index name to check.
	 * @return bool
	 * @since  1.0.0
	 */
	private function indexExists( string $table, string $indexName ): bool {
		global $wpdb;

		$result = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare( 'SHOW INDEX FROM `%1s` WHERE Key_name = %s', $table, $indexName )
		);

		return ! empty( $result );
	}
}
