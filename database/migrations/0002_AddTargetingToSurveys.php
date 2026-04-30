<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migration;

/**
 * Migration: AddTargetingToSurveys
 *
 * Adds a `targeting` JSON column to the af_surveys table to store
 * display-targeting rules as a first-class field.
 *
 * @since 1.0.0
 */
class AddTargetingToSurveys extends Migration {

	/**
	 * Apply the migration.
	 *
	 * @since 1.0.0
	 */
	public function up(): void {
		global $wpdb;

		$table = $this->table( 'af_surveys' );

		// Guard: skip if column already exists (e.g. fresh install from updated migration 0001).
		$column = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare( 'SHOW COLUMNS FROM `%i` LIKE %s', $table, 'targeting' ) // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		);

		if ( ! empty( $column ) ) {
			return;
		}

		$wpdb->query( "ALTER TABLE `{$table}` ADD COLUMN `targeting` json DEFAULT NULL AFTER `styling`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
	}

	/**
	 * Roll back the migration.
	 *
	 * @since 1.0.0
	 */
	public function down(): void {
		global $wpdb;

		$table = $this->table( 'af_surveys' );
		$wpdb->query( "ALTER TABLE `{$table}` DROP COLUMN IF EXISTS `targeting`" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
	}
}
