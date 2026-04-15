<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migration;

/**
 * Migration: AddIpAddressToResponses
 *
 * Adds the optional `ip_address` column to af_responses for admins who want
 * to store and display the raw visitor IP. The column is nullable — a NULL
 * value means privacy mode was active at submission time.
 *
 * @since 1.0.0
 */
class AddIpAddressToResponses extends Migration {

	/**
	 * Apply the migration.
	 *
	 * @since 1.0.0
	 */
	public function up(): void {
		global $wpdb;

		$table = $this->table( 'af_responses' );

		$exists = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare( 'SHOW COLUMNS FROM `%1s` LIKE %s', $table, 'ip_address' )
		);

		if ( empty( $exists ) ) {
			$wpdb->query( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
				"ALTER TABLE `{$table}` ADD COLUMN `ip_address` VARCHAR(45) NULL DEFAULT NULL AFTER `ip_hash`" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
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

		$wpdb->query( "ALTER TABLE `{$table}` DROP COLUMN `ip_address`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
	}
}
