<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migration;

/**
 * Migration: AddGuestTokenToResponses
 *
 * Adds the nullable `guest_token` column to af_responses for tracking
 * anonymous guest submissions via a UUID stored in the visitor's localStorage.
 *
 * @since 1.0.0
 */
class AddGuestTokenToResponses extends Migration {

	/**
	 * Apply the migration.
	 *
	 * @since 1.0.0
	 */
	public function up(): void {
		global $wpdb;

		$table = $this->table( 'af_responses' );

		$exists = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare( 'SHOW COLUMNS FROM `%1s` LIKE %s', $table, 'guest_token' )
		);

		if ( empty( $exists ) ) {
			$wpdb->query( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
				"ALTER TABLE `{$table}` ADD COLUMN `guest_token` VARCHAR(36) NULL DEFAULT NULL AFTER `user_id`" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
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

		$wpdb->query( "ALTER TABLE `{$table}` DROP COLUMN `guest_token`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
	}
}
