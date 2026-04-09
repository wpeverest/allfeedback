<?php

declare(strict_types=1);

namespace AllFeedback\Survey;

defined( 'ABSPATH' ) || exit;

/**
 * Class Manager
 *
 * Table gateway for the af_surveys custom table.
 * All SQL for survey retrieval, creation, mutation, and deletion lives here.
 * Callers receive plain objects as returned by wpdb, with JSON columns
 * stored as raw strings — decoding is the controller's responsibility.
 *
 * @package AllFeedback\Survey
 * @since   1.0.0
 */
class Manager {

	/**
	 * Bare table name (without the WordPress prefix).
	 *
	 * @since 1.0.0
	 */
	private const TABLE = 'af_surveys';

	/**
	 * Valid status values for a survey.
	 *
	 * @since 1.0.0
	 */
	public const STATUSES = [ 'draft', 'published', 'archived' ];

	/**
	 * Field types that the form builder may use inside form_schema.
	 *
	 * @since 1.0.0
	 */
	public const FIELD_TYPES = [
		'nps',
		'csat',
		'ces',
		'star_rating',
		'text',
		'textarea',
		'radio',
		'checkbox',
		'dropdown',
		'email',
		'yes_no',
	];

	/**
	 * Columns that the caller is allowed to sort by.
	 *
	 * @since 1.0.0
	 */
	private const ALLOWED_ORDERBY = [
		'id',
		'title',
		'status',
		'response_count',
		'created_at',
		'updated_at',
	];

	// ------------------------------------------------------------------
	// Public API
	// ------------------------------------------------------------------

	/**
	 * Return a paginated list of surveys.
	 *
	 * @param int         $perPage  Maximum rows to return.
	 * @param int         $offset   Number of rows to skip.
	 * @param string|null $search   Optional title keyword filter.
	 * @param string|null $status   Optional status filter.
	 * @param string      $orderby  Column to sort by (whitelisted).
	 * @param string      $order    Sort direction: ASC or DESC.
	 * @return object[]
	 * @since 1.0.0
	 */
	public function all(
		int $perPage      = 20,
		int $offset       = 0,
		?string $search   = null,
		?string $status   = null,
		string $orderby   = 'created_at',
		string $order     = 'DESC'
	): array {
		global $wpdb;

		$orderby = in_array( $orderby, self::ALLOWED_ORDERBY, true ) ? $orderby : 'created_at';
		$order   = strtoupper( $order ) === 'ASC' ? 'ASC' : 'DESC';

		[ $where, $values ] = $this->buildWhere( $search, $status );

		$table = $this->table();
		$values[] = $perPage;
		$values[] = $offset;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} {$where} ORDER BY {$orderby} {$order} LIMIT %d OFFSET %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$values
			)
		);

		return $rows ?: [];
	}

	/**
	 * Count surveys matching the supplied filters.
	 *
	 * @param string|null $search Optional title keyword filter.
	 * @param string|null $status Optional status filter.
	 * @return int
	 * @since 1.0.0
	 */
	public function count( ?string $search = null, ?string $status = null ): int {
		global $wpdb;

		[ $where, $values ] = $this->buildWhere( $search, $status );

		$table = $this->table();

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$total = $wpdb->get_var(
			$values
				? $wpdb->prepare( "SELECT COUNT(*) FROM {$table} {$where}", $values ) // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				: "SELECT COUNT(*) FROM {$table}" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		return (int) $total;
	}

	/**
	 * Retrieve a single survey by its primary key.
	 * Returns null when no record exists for the given ID.
	 *
	 * @param int $id Survey primary key.
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
	 * Insert a new survey row and return the generated ID.
	 * Returns false when the insert fails.
	 *
	 * @param array<string, mixed> $data Column-value map. JSON columns must be pre-encoded strings.
	 * @return int|false
	 * @since 1.0.0
	 */
	public function insert( array $data ): int|false {
		global $wpdb;

		$data['created_at'] = current_time( 'mysql' );

		$formats = $this->columnFormats( $data );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$result = $wpdb->insert( $this->table(), $data, $formats );

		if ( $result === false ) {
			return false;
		}

		return (int) $wpdb->insert_id;
	}

	/**
	 * Update an existing survey row.
	 * Returns true on success, false on failure or when no row was affected.
	 *
	 * @param int                  $id   Survey primary key.
	 * @param array<string, mixed> $data Column-value map of fields to update.
	 * @return bool
	 * @since 1.0.0
	 */
	public function update( int $id, array $data ): bool {
		global $wpdb;

		$data['updated_at'] = current_time( 'mysql' );

		$formats = $this->columnFormats( $data );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->update(
			$this->table(),
			$data,
			[ 'id' => $id ],
			$formats,
			[ '%d' ]
		);

		return $result !== false;
	}

	/**
	 * Delete or archive a survey.
	 *
	 * When $force is false the survey is soft-deleted by setting its status
	 * to 'archived' so historical response data remains intact.
	 * When $force is true the row is permanently removed from the database.
	 *
	 * @param int  $id    Survey primary key.
	 * @param bool $force True to permanently delete; false to archive.
	 * @return bool
	 * @since 1.0.0
	 */
	public function delete( int $id, bool $force = false ): bool {
		global $wpdb;

		if ( ! $force ) {
			return $this->updateStatus( $id, 'archived' );
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->delete( $this->table(), [ 'id' => $id ], [ '%d' ] );

		return $result !== false && $result > 0;
	}

	/**
	 * Create a copy of an existing survey.
	 *
	 * The duplicate receives "Copy of " prepended to its title and is reset
	 * to 'draft' status with a zeroed response count.
	 * Returns the new survey's ID on success, false on failure.
	 *
	 * @param int $id Source survey primary key.
	 * @return int|false
	 * @since 1.0.0
	 */
	public function duplicate( int $id ): int|false {
		$original = $this->find( $id );

		if ( $original === null ) {
			return false;
		}

		$data = [
			'title'          => sprintf(
				/* translators: %s: Original survey title */
				__( 'Copy of %s', 'all-feedback' ),
				$original->title
			),
			'description'    => $original->description,
			'form_schema'    => $original->form_schema,
			'settings'       => $original->settings,
			'targeting'      => $original->targeting,
			'status'         => 'draft',
			'response_count' => 0,
			'created_by'     => get_current_user_id() ?: null,
		];

		return $this->insert( $data );
	}

	/**
	 * Change the status of a survey.
	 *
	 * @param int    $id     Survey primary key.
	 * @param string $status New status value (must be in self::STATUSES).
	 * @return bool
	 * @since 1.0.0
	 */
	public function updateStatus( int $id, string $status ): bool {
		return $this->update( $id, [ 'status' => $status ] );
	}

	/**
	 * Atomically increment the cached response count.
	 *
	 * @param int $id Survey primary key.
	 * @return bool
	 * @since 1.0.0
	 */
	public function incrementResponseCount( int $id ): bool {
		global $wpdb;

		$table = $this->table();

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->query(
			$wpdb->prepare( "UPDATE {$table} SET response_count = response_count + 1, updated_at = %s WHERE id = %d", current_time( 'mysql' ), $id ) // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		return $result !== false;
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Return the fully-qualified table name including the WordPress prefix.
	 *
	 * @return string e.g. 'wp_af_surveys'
	 * @since 1.0.0
	 */
	private function table(): string {
		global $wpdb;
		return $wpdb->prefix . self::TABLE;
	}

	/**
	 * Build the WHERE clause and its corresponding placeholder values for
	 * the supplied filter combination.
	 *
	 * Returns a two-element array: [ string $where, array $values ].
	 *
	 * @param string|null $search Optional title LIKE filter.
	 * @param string|null $status Optional exact status filter.
	 * @return array{ 0: string, 1: array<int, mixed> }
	 * @since 1.0.0
	 */
	private function buildWhere( ?string $search, ?string $status ): array {
		global $wpdb;

		$conditions = [];
		$values     = [];

		if ( $search !== null && $search !== '' ) {
			$conditions[] = 'title LIKE %s';
			$values[]     = '%' . $wpdb->esc_like( $search ) . '%';
		}

		if ( $status !== null && in_array( $status, self::STATUSES, true ) ) {
			$conditions[] = 'status = %s';
			$values[]     = $status;
		}

		$where = $conditions ? 'WHERE ' . implode( ' AND ', $conditions ) : '';

		return [ $where, $values ];
	}

	/**
	 * Derive the wpdb format array for the supplied column-value map.
	 *
	 * Columns whose values are integers use %d; all others use %s.
	 *
	 * @param array<string, mixed> $data
	 * @return string[]
	 * @since 1.0.0
	 */
	private function columnFormats( array $data ): array {
		$intColumns = [ 'id', 'response_count', 'created_by' ];
		$formats    = [];

		foreach ( array_keys( $data ) as $column ) {
			$formats[] = in_array( $column, $intColumns, true ) ? '%d' : '%s';
		}

		return $formats;
	}
}
