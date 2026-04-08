<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

use AllFeedback\Infrastructure\Database\Migration;

/**
 * Migration: CreateInitialTables
 *
 * Creates the af_surveys and af_responses custom tables.
 *
 * af_surveys  — survey definitions (form schema, settings, targeting, status).
 * af_responses — individual submissions linked to a survey.
 *
 * @since 1.0.0
 */
class CreateInitialTables extends Migration {

	/**
	 * Apply the migration.
	 *
	 * @since 1.0.0
	 */
	public function up(): void {
		$charset = $this->charsetCollate();

		$this->dbDelta(
			"CREATE TABLE IF NOT EXISTS {$this->table( 'af_surveys' )} (
			id             bigint(20) unsigned  NOT NULL AUTO_INCREMENT,
			title          varchar(255)         NOT NULL DEFAULT '',
			description    text                          DEFAULT NULL,
			form_schema    longtext                      DEFAULT NULL,
			settings       longtext                      DEFAULT NULL,
			targeting      longtext                      DEFAULT NULL,
			status         varchar(20)          NOT NULL DEFAULT 'draft',
			response_count int unsigned         NOT NULL DEFAULT 0,
			created_by     bigint(20) unsigned           DEFAULT NULL,
			created_at     datetime             NOT NULL,
			updated_at     datetime                      DEFAULT NULL,
			PRIMARY KEY  (id),
			KEY status     (status),
			KEY created_by (created_by),
			KEY created_at (created_at)
		) {$charset};"
		);

		$this->dbDelta(
			"CREATE TABLE IF NOT EXISTS {$this->table( 'af_responses' )} (
			id            bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			survey_id     bigint(20) unsigned NOT NULL,
			response_data longtext                     DEFAULT NULL,
			score         smallint                     DEFAULT NULL,
			page_url      varchar(2083)                DEFAULT NULL,
			device_type   varchar(20)                  DEFAULT NULL,
			ip_hash       varchar(64)                  DEFAULT NULL,
			user_id       bigint(20) unsigned          DEFAULT NULL,
			consent_given tinyint(1)          NOT NULL DEFAULT 0,
			created_at    datetime            NOT NULL,
			PRIMARY KEY  (id),
			KEY survey_id  (survey_id),
			KEY ip_hash    (ip_hash),
			KEY user_id    (user_id),
			KEY created_at (created_at)
		) {$charset};"
		);
	}

	/**
	 * Roll back the migration.
	 *
	 * @since 1.0.0
	 */
	public function down(): void {
		global $wpdb;

		$tables = [
			$this->table( 'af_responses' ),
			$this->table( 'af_surveys' ),
		];

		foreach ( $tables as $table ) {
			$wpdb->query( "DROP TABLE IF EXISTS {$table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange, PluginCheck.Security.DirectDB.UnescapedDBParameter
		}
	}
}
