<?php

declare(strict_types=1);

namespace AllFeedback\Survey;

defined( 'ABSPATH' ) || exit;

/**
 * Class ResponseManager
 *
 * Table gateway for the af_responses custom table.
 * All SQL for response querying, insertion, and deletion lives here.
 * Callers receive plain stdClass objects as returned by wpdb; JSON columns
 * are raw strings — decoding is the controller's responsibility.
 *
 * @package AllFeedback\Survey
 * @since   1.0.0
 */
class ResponseManager {

	/**
	 * Bare table name (without the WordPress prefix).
	 *
	 * @since 1.0.0
	 */
	private const TABLE = 'af_responses';

	/**
	 * Nonce action used to authenticate public widget submissions.
	 *
	 * @since 1.0.0
	 */
	public const NONCE_ACTION = 'allfeedback_submit';

	// ------------------------------------------------------------------
	// Read
	// ------------------------------------------------------------------

	/**
	 * Retrieve a single response by its primary key.
	 *
	 * @param int $id Response primary key.
	 * @return object|null
	 * @since 1.0.0
	 */
	public function find( int $id ): ?object {
		global $wpdb;

		$table = $this->table();

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d LIMIT 1", $id ) // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		return $row ?: null;
	}

	/**
	 * Return a paginated list of responses for a survey with optional date filters.
	 *
	 * @param int    $surveyId Survey primary key.
	 * @param int    $perPage  Maximum rows to return.
	 * @param int    $offset   Number of rows to skip.
	 * @param string $dateFrom Optional lower-bound date (Y-m-d). Empty string = no bound.
	 * @param string $dateTo   Optional upper-bound date (Y-m-d). Empty string = no bound.
	 * @return object[]
	 * @since 1.0.0
	 */
	public function findBySurvey(
		int $surveyId,
		int $perPage    = 20,
		int $offset     = 0,
		string $dateFrom = '',
		string $dateTo   = ''
	): array {
		global $wpdb;

		[ $where, $values ] = $this->buildWhere( $surveyId, $dateFrom, $dateTo );

		$table    = $this->table();
		$values[] = $perPage;
		$values[] = $offset;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} {$where} ORDER BY created_at DESC LIMIT %d OFFSET %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$values
			)
		);

		return $rows ?: [];
	}

	/**
	 * Count responses for a survey matching the optional date filters.
	 *
	 * @param int    $surveyId Survey primary key.
	 * @param string $dateFrom Optional lower-bound date (Y-m-d).
	 * @param string $dateTo   Optional upper-bound date (Y-m-d).
	 * @return int
	 * @since 1.0.0
	 */
	public function countBySurvey( int $surveyId, string $dateFrom = '', string $dateTo = '' ): int {
		global $wpdb;

		[ $where, $values ] = $this->buildWhere( $surveyId, $dateFrom, $dateTo );

		$table = $this->table();

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$table} {$where}", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$values
			)
		);
	}

	/**
	 * Return a paginated list of all responses across every survey.
	 *
	 * @param int    $perPage  Maximum rows to return.
	 * @param int    $offset   Number of rows to skip.
	 * @param string $dateFrom Optional lower-bound date (Y-m-d). Empty string = no bound.
	 * @param string $dateTo   Optional upper-bound date (Y-m-d). Empty string = no bound.
	 * @return object[]
	 * @since 1.0.0
	 */
	public function findAll(
		int $perPage    = 20,
		int $offset     = 0,
		string $dateFrom = '',
		string $dateTo   = ''
	): array {
		global $wpdb;

		[ $where, $values ] = $this->buildWhereAll( $dateFrom, $dateTo );

		$table    = $this->table();
		$values[] = $perPage;
		$values[] = $offset;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} {$where} ORDER BY created_at DESC LIMIT %d OFFSET %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$values
			)
		);

		return $rows ?: [];
	}

	/**
	 * Count all responses across every survey.
	 *
	 * @param string $dateFrom Optional lower-bound date (Y-m-d).
	 * @param string $dateTo   Optional upper-bound date (Y-m-d).
	 * @return int
	 * @since 1.0.0
	 */
	public function countAll( string $dateFrom = '', string $dateTo = '' ): int {
		global $wpdb;

		[ $where, $values ] = $this->buildWhereAll( $dateFrom, $dateTo );

		$table = $this->table();

		if ( empty( $values ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		}

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$table} {$where}", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$values
			)
		);
	}

	// ------------------------------------------------------------------
	// Write
	// ------------------------------------------------------------------

	/**
	 * Insert a new response row and return the generated ID.
	 * Returns false when the insert fails.
	 *
	 * @param array<string, mixed> $data Column-value map. JSON columns must be pre-encoded strings.
	 * @return int|false
	 * @since 1.0.0
	 */
	public function insert( array $data ): int|false {
		global $wpdb;

		$intCols = [ 'survey_id', 'score', 'user_id', 'consent_given', 'is_read' ];
		$formats = [];

		foreach ( array_keys( $data ) as $col ) {
			$formats[] = in_array( $col, $intCols, true ) ? '%d' : '%s';
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$result = $wpdb->insert( $this->table(), $data, $formats );

		if ( $result === false ) {
			return false;
		}

		return (int) $wpdb->insert_id;
	}

	/**
	 * Update columns on an existing response row.
	 *
	 * Only the columns present in $data are touched; everything else is left
	 * unchanged. Caller must pre-encode JSON columns as strings.
	 *
	 * @param int                  $id   Response primary key.
	 * @param array<string, mixed> $data Column-value map to update.
	 * @return bool True when at least one row was updated; false on DB error.
	 * @since 1.0.0
	 */
	public function update( int $id, array $data ): bool {
		global $wpdb;

		$intCols = [ 'score', 'user_id', 'consent_given', 'is_read' ];
		$formats = [];

		foreach ( array_keys( $data ) as $col ) {
			$formats[] = in_array( $col, $intCols, true ) ? '%d' : '%s';
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->update( $this->table(), $data, [ 'id' => $id ], $formats, [ '%d' ] );

		return $result !== false;
	}

	/**
	 * Permanently delete a single response by its primary key.
	 *
	 * @param int $id Response primary key.
	 * @return bool
	 * @since 1.0.0
	 */
	public function delete( int $id ): bool {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->delete( $this->table(), [ 'id' => $id ], [ '%d' ] );

		return $result !== false && $result > 0;
	}

	/**
	 * Permanently delete all responses belonging to a survey.
	 *
	 * @param int $surveyId Survey primary key.
	 * @return bool
	 * @since 1.0.0
	 */
	public function deleteBySurvey( int $surveyId ): bool {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->delete( $this->table(), [ 'survey_id' => $surveyId ], [ '%d' ] );

		return $result !== false;
	}

	// ------------------------------------------------------------------
	// Validation helpers
	// ------------------------------------------------------------------

	/**
	 * Check whether a response from the same IP already exists for this survey.
	 *
	 * @param int $surveyId        Survey primary key.
	 * @param string $ipHash       Anonymized HMAC-SHA256 IP hash.
	 * @param int $windowHours     Look-back window in hours. 0 = all time (no window).
	 * @return bool
	 * @since 1.0.0
	 */
	public function isDuplicate( int $surveyId, string $ipHash, int $windowHours = 0 ): bool {
		global $wpdb;

		$table = $this->table();

		if ( $windowHours > 0 ) {
			$cutoff = gmdate( 'Y-m-d H:i:s', time() - ( $windowHours * HOUR_IN_SECONDS ) );

			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$table} WHERE survey_id = %d AND ip_hash = %s AND created_at >= %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$surveyId,
					$ipHash,
					$cutoff
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$table} WHERE survey_id = %d AND ip_hash = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$surveyId,
					$ipHash
				)
			);
		}

		return $exists !== null;
	}

	/**
	 * Hash the visitor's IP address for anonymised duplicate detection.
	 *
	 * HMAC-SHA256 with the WordPress auth key as the secret so the hash
	 * cannot be reversed to recover the original IP while still being unique
	 * per visitor per install.
	 *
	 * @return string 64-character hex digest.
	 * @since 1.0.0
	 */
	public function hashIp(): string {
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		$raw    = (string) ( $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '' );
		$ip     = sanitize_text_field( trim( explode( ',', $raw )[0] ) );
		$secret = defined( 'AUTH_KEY' ) ? AUTH_KEY : 'allfeedback';

		return hash_hmac( 'sha256', $ip, $secret );
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Return the fully-qualified table name including the WordPress prefix.
	 *
	 * @return string e.g. 'wp_af_responses'
	 * @since 1.0.0
	 */
	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . self::TABLE;
	}

	/**
	 * Build a WHERE clause for optional date bounds only (all surveys).
	 *
	 * @param string $dateFrom
	 * @param string $dateTo
	 * @return array{0: string, 1: array<int, mixed>}
	 * @since 1.0.0
	 */
	private function buildWhereAll( string $dateFrom, string $dateTo ): array {
		$conditions = [];
		$values     = [];

		if ( $dateFrom !== '' ) {
			$conditions[] = 'DATE(created_at) >= %s';
			$values[]     = $dateFrom;
		}

		if ( $dateTo !== '' ) {
			$conditions[] = 'DATE(created_at) <= %s';
			$values[]     = $dateTo;
		}

		$where = ! empty( $conditions ) ? 'WHERE ' . implode( ' AND ', $conditions ) : '';

		return [ $where, $values ];
	}

	/**
	 * Build a WHERE clause for survey_id + optional date bounds.
	 *
	 * @param int    $surveyId
	 * @param string $dateFrom
	 * @param string $dateTo
	 * @return array{0: string, 1: array<int, mixed>}
	 * @since 1.0.0
	 */
	private function buildWhere( int $surveyId, string $dateFrom, string $dateTo ): array {
		$conditions = [ 'survey_id = %d' ];
		$values     = [ $surveyId ];

		if ( $dateFrom !== '' ) {
			$conditions[] = 'DATE(created_at) >= %s';
			$values[]     = $dateFrom;
		}

		if ( $dateTo !== '' ) {
			$conditions[] = 'DATE(created_at) <= %s';
			$values[]     = $dateTo;
		}

		return [ 'WHERE ' . implode( ' AND ', $conditions ), $values ];
	}
}
