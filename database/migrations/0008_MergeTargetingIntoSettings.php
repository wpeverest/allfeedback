<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migration;

/**
 * Migration: MergeTargetingIntoSettings
 *
 * Moves the `targeting` column data into the `settings` JSON column as
 * `settings.targeting`, then drops the now-redundant `targeting` column.
 *
 * Before: wp_af_surveys has separate `settings` (longtext) and `targeting` (longtext).
 * After:  targeting data lives at settings['targeting']; no separate column.
 *
 * @since 1.0.0
 */
class MergeTargetingIntoSettings extends Migration {

	/**
	 * Apply the migration.
	 *
	 * @since 1.0.0
	 */
	public function up(): void {
		global $wpdb;

		$table = $this->table( 'af_surveys' );

		// Bail early if the column is already gone.
		$exists = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare( 'SHOW COLUMNS FROM `%1s` LIKE %s', $table, 'targeting' )
		);

		if ( empty( $exists ) ) {
			return;
		}

		// For every row that has non-empty targeting JSON, merge it into settings.
		$rows = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			"SELECT id, settings, targeting FROM `{$table}` WHERE targeting IS NOT NULL AND targeting != '' AND targeting != '[]' AND targeting != '{}'",
			ARRAY_A
		);

		foreach ( (array) $rows as $row ) {
			$targeting = json_decode( (string) $row['targeting'], true );
			if ( ! is_array( $targeting ) || empty( $targeting ) ) {
				continue;
			}

			$settings = json_decode( (string) $row['settings'], true );
			if ( ! is_array( $settings ) ) {
				$settings = [];
			}

			$settings['targeting'] = $targeting;

			$wpdb->update( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$table,
				[ 'settings' => wp_json_encode( $settings ) ],
				[ 'id'       => (int) $row['id'] ],
				[ '%s' ],
				[ '%d' ]
			);
		}

		// Drop the now-redundant column.
		$wpdb->query( "ALTER TABLE `{$table}` DROP COLUMN `targeting`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
	}

	/**
	 * Roll back the migration.
	 *
	 * @since 1.0.0
	 */
	public function down(): void {
		global $wpdb;

		$table = $this->table( 'af_surveys' );

		// Re-add the targeting column after styling.
		$exists = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare( 'SHOW COLUMNS FROM `%1s` LIKE %s', $table, 'targeting' )
		);

		if ( empty( $exists ) ) {
			$wpdb->query( "ALTER TABLE `{$table}` ADD COLUMN `targeting` longtext NULL DEFAULT NULL AFTER `styling`" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
		}

		// Move settings.targeting back out to the targeting column.
		$rows = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			"SELECT id, settings FROM `{$table}` WHERE settings IS NOT NULL",
			ARRAY_A
		);

		foreach ( (array) $rows as $row ) {
			$settings = json_decode( (string) $row['settings'], true );
			if ( ! is_array( $settings ) || ! isset( $settings['targeting'] ) ) {
				continue;
			}

			$targeting = $settings['targeting'];
			unset( $settings['targeting'] );

			$wpdb->update( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$table,
				[
					'settings'  => wp_json_encode( $settings ),
					'targeting' => wp_json_encode( $targeting ),
				],
				[ 'id' => (int) $row['id'] ],
				[ '%s', '%s' ],
				[ '%d' ]
			);
		}
	}
}
