<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migration;

/**
 * Migration: AddSurveyIndexes
 *
 * Adds performance indexes to the af_surveys and af_responses tables
 * if those indexes do not already exist.
 *
 * af_surveys  — indexes on: status, created_by
 * af_responses — indexes on: survey_id, user_id, created_at
 *
 * Note: dbDelta() does not manage index-only changes reliably, so this
 * migration uses direct wpdb queries guarded by an existence check.
 *
 * @since 1.0.0
 */
class AddSurveyIndexes extends Migration {

	/**
	 * Apply the migration.
	 *
	 * @since 1.0.0
	 */
	public function up(): void {
		global $wpdb;

		$surveysTable   = $this->table( 'af_surveys' );
		$responsesTable = $this->table( 'af_responses' );

		$surveysIndexes = [
			'status'     => "ALTER TABLE `{$surveysTable}` ADD INDEX `status` (`status`)",
			'created_by' => "ALTER TABLE `{$surveysTable}` ADD INDEX `created_by` (`created_by`)",
		];

		$responsesIndexes = [
			'survey_id'  => "ALTER TABLE `{$responsesTable}` ADD INDEX `survey_id` (`survey_id`)",
			'user_id'    => "ALTER TABLE `{$responsesTable}` ADD INDEX `user_id` (`user_id`)",
			'created_at' => "ALTER TABLE `{$responsesTable}` ADD INDEX `created_at` (`created_at`)",
		];

		foreach ( $surveysIndexes as $indexName => $sql ) {
			if ( ! $this->indexExists( $surveysTable, $indexName ) ) {
				$wpdb->query( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
			}
		}

		foreach ( $responsesIndexes as $indexName => $sql ) {
			if ( ! $this->indexExists( $responsesTable, $indexName ) ) {
				$wpdb->query( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
			}
		}
	}

	/**
	 * Roll back the migration.
	 *
	 * Drops the indexes added by up(), guarded so it is safe to run even if
	 * an index was never created.
	 *
	 * @since 1.0.0
	 */
	public function down(): void {
		global $wpdb;

		$surveysTable   = $this->table( 'af_surveys' );
		$responsesTable = $this->table( 'af_responses' );

		$drops = [
			$surveysTable   => [ 'status', 'created_by' ],
			$responsesTable => [ 'survey_id', 'user_id', 'created_at' ],
		];

		foreach ( $drops as $table => $indexes ) {
			foreach ( $indexes as $indexName ) {
				if ( $this->indexExists( $table, $indexName ) ) {
					$wpdb->query( "ALTER TABLE `{$table}` DROP INDEX `{$indexName}`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
				}
			}
		}
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
