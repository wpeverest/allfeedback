<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migration;

/**
 * Migration: AddSurveyStylingColumn
 *
 * Adds the `styling` JSON column to af_surveys to store per-survey visual
 * appearance overrides (widget icon, label, position) separately from the
 * behavioural `settings` column.
 *
 * @since 1.0.0
 */
class AddSurveyStylingColumn extends Migration {

	/**
	 * Apply the migration.
	 *
	 * @since 1.0.0
	 */
	public function up(): void {
		global $wpdb;

		$table = $this->table( 'af_surveys' );

		$exists = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare( 'SHOW COLUMNS FROM `%1s` LIKE %s', $table, 'styling' )
		);

		if ( empty( $exists ) ) {
			$wpdb->query( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
				"ALTER TABLE `{$table}` ADD COLUMN `styling` JSON NULL DEFAULT NULL AFTER `settings`" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
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

		$table = $this->table( 'af_surveys' );

		$wpdb->query( "ALTER TABLE `{$table}` DROP COLUMN `styling`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
	}
}
