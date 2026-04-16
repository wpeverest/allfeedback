<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migration;

/**
 * Migration: AddResponseCompositeIndexes
 *
 * Adds composite indexes that cover the most common query patterns on
 * af_responses: analytics by survey + date, unread counts, and duplicate
 * IP detection with time windows.
 *
 * @since 1.0.0
 */
class AddResponseCompositeIndexes extends Migration {

	/**
	 * Apply the migration.
	 *
	 * @since 1.0.0
	 */
	public function up(): void {
		global $wpdb;

		$table = $this->table( 'af_responses' );

		$indexes = [
			'idx_survey_created'    => "ALTER TABLE `{$table}` ADD INDEX `idx_survey_created` (`survey_id`, `created_at`)",
			'idx_survey_unread'     => "ALTER TABLE `{$table}` ADD INDEX `idx_survey_unread` (`survey_id`, `is_read`)",
			'idx_ip_survey_created' => "ALTER TABLE `{$table}` ADD INDEX `idx_ip_survey_created` (`ip_hash`, `survey_id`, `created_at`)",
		];

		foreach ( $indexes as $name => $sql ) {
			if ( ! $this->indexExists( $table, $name ) ) {
				$wpdb->query( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
			}
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

		foreach ( [ 'idx_survey_created', 'idx_survey_unread', 'idx_ip_survey_created' ] as $name ) {
			if ( $this->indexExists( $table, $name ) ) {
				$wpdb->query( "ALTER TABLE `{$table}` DROP INDEX `{$name}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
			}
		}
	}

	/**
	 * Check whether an index exists on a table.
	 *
	 * @param string $table Fully-qualified table name.
	 * @param string $name  Index name.
	 * @since 1.0.0
	 */
	private function indexExists( string $table, string $name ): bool {
		global $wpdb;

		return ! empty(
			$wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->prepare( 'SHOW INDEX FROM `%1s` WHERE Key_name = %s', $table, $name )
			)
		);
	}
}
