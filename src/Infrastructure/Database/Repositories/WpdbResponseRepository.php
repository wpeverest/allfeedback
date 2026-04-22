<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Database\Repositories;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Response\Response;
use AllFeedback\Domain\Response\ResponseFilter;
use AllFeedback\Domain\Response\ResponseRepository;
use DateTimeImmutable;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter

/**
 * wpdb-backed implementation of ResponseRepository.
 *
 * Persists Response aggregates to the custom `{prefix}af_responses` table.
 * The response_data JSON column is encoded on write and decoded on read so that
 * the domain layer always works with PHP arrays.
 *
 * @package AllFeedback\Infrastructure\Database\Repositories
 * @since   1.0.0
 */
class WpdbResponseRepository implements ResponseRepository {

	/**
	 * Fully-qualified table name including the wpdb prefix.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private string $table;

	/**
	 * Transient key used to cache the unread response count.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const UNREAD_CACHE_KEY = 'allfeedback_unread_count';

	/**
	 * Column names permitted as ORDER BY targets to prevent SQL injection.
	 *
	 * @var string[]
	 * @since 1.0.0
	 */
	private const ALLOWED_ORDERBY = [
		'id',
		'survey_id',
		'score',
		'created_at',
	];

	/**
	 * @since  1.0.0
	 */
	public function __construct() {
		global $wpdb;
		$this->table = $wpdb->prefix . 'af_responses';
	}

	/**
	 * Persist a new Response and return the saved instance.
	 *
	 * @param  Response $response The aggregate to persist.
	 * @return Response The saved instance with its persistence ID assigned.
	 * @throws \RuntimeException When the wpdb insert fails.
	 * @since  1.0.0
	 */
	public function save( Response $response ): Response {
		global $wpdb;

		$result = $wpdb->insert(
			$this->table,
			[
				'survey_id'     => $response->getSurveyId(),
				'response_data' => wp_json_encode( $response->getResponseData() ),
				'score'         => $response->getScore(),
				'page_url'      => $response->getPageUrl(),
				'device_type'   => $response->getDeviceType(),
				'ip_hash'       => $response->getIpHash(),
				'ip_address'    => $response->getIpAddress(),
				'user_id'       => $response->getUserId(),
				'guest_token'   => $response->getGuestToken(),
				'consent_given' => $response->isConsentGiven() ? 1 : 0,
				'created_at'    => $response->getCreatedAt()->format( 'Y-m-d H:i:s' ),
			],
			[ '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%d', '%s' ]
		);

		if ( false === $result ) {
			throw new \RuntimeException( 'Failed to insert response: ' . esc_html( $wpdb->last_error ) );
		}

		delete_transient( self::UNREAD_CACHE_KEY );

		return Response::reconstitute(
			id: (int) $wpdb->insert_id,
			surveyId: $response->getSurveyId(),
			responseData: $response->getResponseData(),
			score: $response->getScore(),
			pageUrl: $response->getPageUrl(),
			deviceType: $response->getDeviceType(),
			ipHash: $response->getIpHash(),
			ipAddress: $response->getIpAddress(),
			userId: $response->getUserId(),
			guestToken: $response->getGuestToken(),
			consentGiven: $response->isConsentGiven(),
			createdAt: $response->getCreatedAt(),
		);
	}

	/**
	 * Retrieve a single Response by its primary key, or null if not found.
	 *
	 * @param  int $id Response primary key.
	 * @return Response|null
	 * @since  1.0.0
	 */
	public function findById( int $id ): ?Response {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$this->table} WHERE id = %d LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$id
			),
			ARRAY_A
		);

		return $row ? $this->hydrate( $row ) : null;
	}

	/**
	 * Retrieve all Responses for a given Survey, applying the filter.
	 *
	 * @param  int            $surveyId Survey primary key.
	 * @param  ResponseFilter $filter   Query constraints and pagination.
	 * @return Response[]
	 * @since  1.0.0
	 */
	public function findBySurveyId( int $surveyId, ResponseFilter $filter ): array {
		global $wpdb;

		[ $where, $params ] = $this->buildFilterQuery( $surveyId, $filter );

		$orderBy = in_array( $filter->orderBy, self::ALLOWED_ORDERBY, true ) ? $filter->orderBy : 'created_at';
		$order   = strtoupper( $filter->order ) === 'ASC' ? 'ASC' : 'DESC';
		$limit   = max( 1, $filter->perPage );
		$offset  = max( 0, ( $filter->page - 1 ) * $limit );

		$whereClause = 'WHERE ' . implode( ' AND ', $where );
		$sql         = "SELECT * FROM {$this->table} {$whereClause} ORDER BY {$orderBy} {$order} LIMIT %d OFFSET %d"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		$params[] = $limit;
		$params[] = $offset;

		$rows = $wpdb->get_results( $wpdb->prepare( $sql, ...$params ), ARRAY_A ) ?: []; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return array_map( [ $this, 'hydrate' ], $rows );
	}

	/**
	 * Count all Responses for a given Survey, applying the filter.
	 *
	 * @param  int            $surveyId Survey primary key.
	 * @param  ResponseFilter $filter   Query constraints.
	 * @return int
	 * @since  1.0.0
	 */
	public function countBySurveyId( int $surveyId, ResponseFilter $filter ): int {
		global $wpdb;

		[ $where, $params ] = $this->buildFilterQuery( $surveyId, $filter );

		$whereClause = 'WHERE ' . implode( ' AND ', $where );
		$sql         = "SELECT COUNT(*) FROM {$this->table} {$whereClause}"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( $params !== [] ) {
			return (int) $wpdb->get_var( $wpdb->prepare( $sql, ...$params ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		}

		return (int) $wpdb->get_var( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	/**
	 * Retrieve all Responses across every survey, applying the filter (pagination + date).
	 *
	 * @param  ResponseFilter $filter Query constraints and pagination.
	 * @return Response[]
	 * @since  1.0.0
	 */
	public function findAll( ResponseFilter $filter ): array {
		global $wpdb;

		[ $where, $params ] = $this->buildGlobalFilterQuery( $filter );

		$orderBy = in_array( $filter->orderBy, self::ALLOWED_ORDERBY, true ) ? $filter->orderBy : 'created_at';
		$order   = strtoupper( $filter->order ) === 'ASC' ? 'ASC' : 'DESC';
		$limit   = max( 1, $filter->perPage );
		$offset  = max( 0, ( $filter->page - 1 ) * $limit );

		$whereClause = $where !== [] ? 'WHERE ' . implode( ' AND ', $where ) : '';
		$sql         = "SELECT * FROM {$this->table} {$whereClause} ORDER BY {$orderBy} {$order} LIMIT %d OFFSET %d"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		$params[] = $limit;
		$params[] = $offset;

		$rows = $wpdb->get_results( $wpdb->prepare( $sql, ...$params ), ARRAY_A ) ?: []; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return array_map( [ $this, 'hydrate' ], $rows );
	}

	/**
	 * Count all Responses across every survey, applying the filter.
	 *
	 * @param  ResponseFilter $filter Query constraints.
	 * @return int
	 * @since  1.0.0
	 */
	public function countAll( ResponseFilter $filter ): int {
		global $wpdb;

		[ $where, $params ] = $this->buildGlobalFilterQuery( $filter );

		$whereClause = $where !== [] ? 'WHERE ' . implode( ' AND ', $where ) : '';
		$sql         = "SELECT COUNT(*) FROM {$this->table} {$whereClause}"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		if ( $params !== [] ) {
			return (int) $wpdb->get_var( $wpdb->prepare( $sql, ...$params ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		}

		return (int) $wpdb->get_var( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	/**
	 * Update specific columns of a Response row.
	 *
	 * Accepted keys: response_data (JSON string), is_read (0|1).
	 *
	 * @param  int                  $id   Response primary key.
	 * @param  array<string, mixed> $data Column → value pairs to update.
	 * @return bool True on success.
	 * @since  1.0.0
	 */
	public function update( int $id, array $data ): bool {
		global $wpdb;

		$allowed = [ 'response_data', 'is_read' ];
		$payload = array_intersect_key( $data, array_flip( $allowed ) );

		if ( empty( $payload ) ) {
			return true;
		}

		$formats = array_map(
			fn( $key ) => $key === 'is_read' ? '%d' : '%s',
			array_keys( $payload )
		);

		$ok = $wpdb->update( $this->table, $payload, [ 'id' => $id ], $formats, [ '%d' ] ) !== false;

		if ( $ok && isset( $payload['is_read'] ) ) {
			delete_transient( self::UNREAD_CACHE_KEY );
		}

		return $ok;
	}

	/**
	 * Permanently remove a single Response by its primary key.
	 *
	 * @param  int $id Response primary key.
	 * @return bool True on success.
	 * @since  1.0.0
	 */
	public function delete( int $id ): bool {
		global $wpdb;
		$ok = $wpdb->delete( $this->table, [ 'id' => $id ], [ '%d' ] ) !== false;

		if ( $ok ) {
			delete_transient( self::UNREAD_CACHE_KEY );
		}

		return $ok;
	}

	/**
	 * Permanently remove all Responses belonging to a given Survey.
	 *
	 * @param  int $surveyId Survey primary key.
	 * @return bool True on success.
	 * @since  1.0.0
	 */
	public function deleteBySurveyId( int $surveyId ): bool {
		global $wpdb;
		$result = $wpdb->delete( $this->table, [ 'survey_id' => $surveyId ], [ '%d' ] );

		if ( $result !== false ) {
			delete_transient( self::UNREAD_CACHE_KEY );
		}

		return $result !== false;
	}

	/**
	 * Count all unread Responses across every non-trashed Survey.
	 *
	 * Result is cached as a transient for 5 minutes to avoid hitting the
	 * database on every admin page load. The cache is invalidated whenever
	 * a response is saved, updated, or deleted via this repository.
	 *
	 * @return int
	 * @since  1.0.0
	 */
	public function countUnread(): int {
		$cached = get_transient( self::UNREAD_CACHE_KEY );

		if ( $cached !== false ) {
			return (int) $cached;
		}

		global $wpdb;

		$surveysTable = $wpdb->prefix . 'af_surveys';

		$count = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$this->table}
				 WHERE is_read = 0
				   AND survey_id IN (SELECT id FROM {$surveysTable} WHERE status != %s)", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'trashed'
			)
		);

		set_transient( self::UNREAD_CACHE_KEY, $count, 5 * MINUTE_IN_SECONDS );

		return $count;
	}

	/**
	 * Return true if a response from the given IP hash already exists for
	 * the survey within the look-back window.
	 *
	 * @param  int    $surveyId    Survey to check against.
	 * @param  string $ipHash      HMAC hash of the visitor IP.
	 * @param  int    $windowHours Look-back window in hours (0 = all-time).
	 * @return bool
	 * @since  1.0.0
	 */
	public function existsByIpHash( int $surveyId, string $ipHash, int $windowHours = 0 ): bool {
		global $wpdb;

		if ( $windowHours > 0 ) {
			$count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$this->table}
					 WHERE survey_id = %d
					   AND ip_hash   = %s
					   AND created_at >= DATE_SUB( NOW(), INTERVAL %d HOUR )",
					$surveyId,
					$ipHash,
					$windowHours
				)
			);
		} else {
			$count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$this->table}
					 WHERE survey_id = %d AND ip_hash = %s",
					$surveyId,
					$ipHash
				)
			);
		}

		return $count > 0;
	}

	/**
	 * Bulk-update is_read for a set of response IDs in two queries (find existing + UPDATE IN).
	 *
	 * @param  int[]  $ids    Response primary keys to update.
	 * @param  bool   $isRead Target read state.
	 * @return int[]          IDs from $ids that were not found in the database.
	 * @since  1.0.0
	 */
	public function bulkUpdateReadStatus( array $ids, bool $isRead ): array {
		if ( empty( $ids ) ) {
			return [];
		}

		global $wpdb;

		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

		$existingIds = $wpdb->get_col( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->prepare(
				"SELECT id FROM {$this->table} WHERE id IN ({$placeholders})", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				...$ids
			)
		);

		$existingIds = array_map( 'intval', $existingIds );
		$missingIds  = array_values( array_diff( $ids, $existingIds ) );

		if ( ! empty( $existingIds ) ) {
			$updatePlaceholders = implode( ',', array_fill( 0, count( $existingIds ), '%d' ) );
			$wpdb->query( // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$wpdb->prepare(
					"UPDATE {$this->table} SET is_read = %d WHERE id IN ({$updatePlaceholders})", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$isRead ? 1 : 0,
					...$existingIds
				)
			);

			delete_transient( self::UNREAD_CACHE_KEY );
		}

		return $missingIds;
	}

	/**
	 * Return true if a logged-in user has already submitted a response for this survey.
	 *
	 * @param  int $surveyId    Survey to check against.
	 * @param  int $userId      WordPress user ID.
	 * @param  int $windowHours Look-back window in hours (0 = all-time).
	 * @return bool
	 * @since  1.0.0
	 */
	public function existsByUserId( int $surveyId, int $userId, int $windowHours = 0 ): bool {
		global $wpdb;

		if ( $windowHours > 0 ) {
			$count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$this->table}
					 WHERE survey_id = %d
					   AND user_id   = %d
					   AND created_at >= DATE_SUB( NOW(), INTERVAL %d HOUR )", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$surveyId,
					$userId,
					$windowHours
				)
			);
		} else {
			$count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$this->table}
					 WHERE survey_id = %d AND user_id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$surveyId,
					$userId
				)
			);
		}

		return $count > 0;
	}

	/**
	 * Return true if a guest visitor UUID has already submitted a response for this survey.
	 *
	 * @param  int    $surveyId    Survey to check against.
	 * @param  string $guestToken  UUID stored in the visitor's localStorage.
	 * @param  int    $windowHours Look-back window in hours (0 = all-time).
	 * @return bool
	 * @since  1.0.0
	 */
	public function existsByGuestToken( int $surveyId, string $guestToken, int $windowHours = 0 ): bool {
		global $wpdb;

		if ( $windowHours > 0 ) {
			$count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$this->table}
					 WHERE survey_id   = %d
					   AND guest_token = %s
					   AND created_at >= DATE_SUB( NOW(), INTERVAL %d HOUR )", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$surveyId,
					$guestToken,
					$windowHours
				)
			);
		} else {
			$count = (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$this->table}
					 WHERE survey_id = %d AND guest_token = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					$surveyId,
					$guestToken
				)
			);
		}

		return $count > 0;
	}

	/**
	 * Aggregate score statistics for a survey using SQL.
	 *
	 * @param  int $surveyId Survey primary key.
	 * @return array{total: int, score_count: int, score_sum: float, promoters: int, passives: int, detractors: int}
	 * @since  1.0.0
	 */
	public function aggregateScoreStats( int $surveyId ): array {
		global $wpdb;

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT
					COUNT(*)                                              AS total,
					COUNT(score)                                          AS score_count,
					COALESCE(SUM(score), 0)                               AS score_sum,
					SUM(CASE WHEN score >= 9              THEN 1 ELSE 0 END) AS promoters,
					SUM(CASE WHEN score >= 7 AND score < 9 THEN 1 ELSE 0 END) AS passives,
					SUM(CASE WHEN score < 7 AND score IS NOT NULL THEN 1 ELSE 0 END) AS detractors
				 FROM {$this->table}
				 WHERE survey_id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$surveyId
			),
			ARRAY_A
		);

		return [
			'total'       => (int) ( $row['total'] ?? 0 ),
			'score_count' => (int) ( $row['score_count'] ?? 0 ),
			'score_sum'   => (float) ( $row['score_sum'] ?? 0 ),
			'promoters'   => (int) ( $row['promoters'] ?? 0 ),
			'passives'    => (int) ( $row['passives'] ?? 0 ),
			'detractors'  => (int) ( $row['detractors'] ?? 0 ),
		];
	}

	/**
	 * Count responses grouped by device_type for a survey using SQL.
	 *
	 * @param  int $surveyId Survey primary key.
	 * @return array<string, int>
	 * @since  1.0.0
	 */
	public function countByDevice( int $surveyId ): array {
		global $wpdb;

		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT COALESCE(device_type, 'unknown') AS device, COUNT(*) AS cnt
				 FROM {$this->table}
				 WHERE survey_id = %d
				 GROUP BY device", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$surveyId
			),
			ARRAY_A
		) ?: [];

		$result = [];
		foreach ( $rows as $row ) {
			$result[ $row['device'] ] = (int) $row['cnt'];
		}

		return $result;
	}

	/**
	 * Count responses grouped by date (Y-m-d) for a survey using SQL.
	 *
	 * @param  int $surveyId Survey primary key.
	 * @return array<string, int>
	 * @since  1.0.0
	 */
	public function countByDate( int $surveyId ): array {
		global $wpdb;

		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT DATE(created_at) AS d, COUNT(*) AS cnt
				 FROM {$this->table}
				 WHERE survey_id = %d
				 GROUP BY d
				 ORDER BY d ASC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$surveyId
			),
			ARRAY_A
		) ?: [];

		$result = [];
		foreach ( $rows as $row ) {
			$result[ $row['d'] ] = (int) $row['cnt'];
		}

		return $result;
	}

	/**
	 * Hydrate a Response aggregate from a raw database row.
	 *
	 * @param  array<string, mixed> $row Raw associative array from wpdb.
	 * @return Response
	 * @since  1.0.0
	 */
	private function hydrate( array $row ): Response {
		return Response::reconstitute(
			id: (int) $row['id'],
			surveyId: (int) $row['survey_id'],
			responseData: $this->decodeJson( (string) ( $row['response_data'] ?? '' ) ),
			score: isset( $row['score'] ) && $row['score'] !== null ? (float) $row['score'] : null,
			pageUrl: $row['page_url'] ?? null,
			deviceType: $row['device_type'] ?? null,
			ipHash: $row['ip_hash'] ?? null,
			ipAddress: $row['ip_address'] ?? null,
			userId: isset( $row['user_id'] ) && $row['user_id'] !== null ? (int) $row['user_id'] : null,
			guestToken: $row['guest_token'] ?? null,
			consentGiven: (bool) ( $row['consent_given'] ?? false ),
			createdAt: new DateTimeImmutable( (string) $row['created_at'] ),
			isRead: (bool) ( $row['is_read'] ?? false ),
		);
	}

	/**
	 * Build the WHERE conditions and parameter list for a response query.
	 *
	 * @param  int            $surveyId Survey primary key constraint.
	 * @param  ResponseFilter $filter   Additional query constraints.
	 * @return array{0: string[], 1: mixed[]}
	 * @since  1.0.0
	 */
	private function buildFilterQuery( int $surveyId, ResponseFilter $filter ): array {
		$where  = [ 'survey_id = %d' ];
		$params = [ $surveyId ];

		if ( $filter->userId !== null ) {
			$where[]  = 'user_id = %d';
			$params[] = $filter->userId;
		}

		if ( $filter->dateFrom !== null && $filter->dateFrom !== '' ) {
			$where[]  = 'DATE(created_at) >= %s';
			$params[] = $filter->dateFrom;
		}

		if ( $filter->dateTo !== null && $filter->dateTo !== '' ) {
			$where[]  = 'DATE(created_at) <= %s';
			$params[] = $filter->dateTo;
		}

		return [ $where, $params ];
	}

	/**
	 * Build WHERE conditions for global response queries (no survey_id constraint).
	 *
	 * @param  ResponseFilter $filter Query constraints.
	 * @return array{0: string[], 1: mixed[]}
	 * @since  1.0.0
	 */
	private function buildGlobalFilterQuery( ResponseFilter $filter ): array {
		$where  = [];
		$params = [];

		if ( $filter->dateFrom !== null && $filter->dateFrom !== '' ) {
			$where[]  = 'DATE(created_at) >= %s';
			$params[] = $filter->dateFrom;
		}

		if ( $filter->dateTo !== null && $filter->dateTo !== '' ) {
			$where[]  = 'DATE(created_at) <= %s';
			$params[] = $filter->dateTo;
		}

		return [ $where, $params ];
	}

	/**
	 * Decode a JSON string to an array, returning an empty array on failure.
	 *
	 * @param  string $json JSON-encoded string.
	 * @return array<mixed>
	 * @since  1.0.0
	 */
	private function decodeJson( string $json ): array {
		if ( $json === '' ) {
			return [];
		}

		$decoded = json_decode( $json, true );
		return is_array( $decoded ) ? $decoded : [];
	}
}
