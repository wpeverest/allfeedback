<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migration;

class AddConflictReasonToSurveys extends Migration {

	public function up(): void {
		global $wpdb;

		$table = $this->table( 'af_surveys' );

		$exists = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare( 'SHOW COLUMNS FROM `%1s` LIKE %s', $table, 'conflict_reason' )
		);

		if ( empty( $exists ) ) {
			$wpdb->query( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
				"ALTER TABLE `{$table}` ADD COLUMN `conflict_reason` TEXT NULL DEFAULT NULL AFTER `status`" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			);
		}
	}

	public function down(): void {
		global $wpdb;

		$table = $this->table( 'af_surveys' );

		$wpdb->query( "ALTER TABLE `{$table}` DROP COLUMN `conflict_reason`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
	}
}
