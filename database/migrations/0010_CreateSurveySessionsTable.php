<?php

declare(strict_types=1);

namespace AllFeedback\Database\Migrations;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Infrastructure\Database\Migration;

class CreateSurveySessionsTable extends Migration {

	public function up(): void {
		$charset = $this->charsetCollate();

		$this->dbDelta(
			"CREATE TABLE IF NOT EXISTS {$this->table( 'af_survey_sessions' )} (
			id             bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			survey_id      bigint(20) unsigned NOT NULL,
			session_id     varchar(36)         NOT NULL,
			user_id        bigint(20) unsigned          DEFAULT NULL,
			guest_id       varchar(36)                  DEFAULT NULL,
			status         varchar(20)         NOT NULL DEFAULT 'viewed',
			started_at     datetime                     DEFAULT NULL,
			submitted_at   datetime                     DEFAULT NULL,
			abandoned_at   datetime                     DEFAULT NULL,
			last_active_at datetime            NOT NULL,
			created_at     datetime            NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY session_id   (session_id),
			KEY survey_id           (survey_id),
			KEY survey_status       (survey_id, status),
			KEY created_at          (created_at)
		) {$charset};"
		);
	}

	public function down(): void {
		global $wpdb;

		$wpdb->query( "DROP TABLE IF EXISTS {$this->table( 'af_survey_sessions' )}" ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.SchemaChange
	}
}
