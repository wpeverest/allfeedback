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
 * @since 1.0.0
 */
class WpdbResponseRepository implements ResponseRepository {

	/** @since 1.0.0 */
	private string $table;

	/** @since 1.0.0 */
	private const ALLOWED_ORDERBY = [
		'id',
		'survey_id',
		'score',
		'created_at',
	];

	/**
	 * @since 1.0.0
	 */
	public function __construct() {
		global $wpdb;
		$this->table = $wpdb->prefix . 'af_responses';
	}

	/**
	 * Persist a new Response and return the saved instance.
	 *
	 * @since 1.0.0
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
				'user_id'       => $response->getUserId(),
				'consent_given' => $response->isConsentGiven() ? 1 : 0,
				'created_at'    => $response->getCreatedAt()->format( 'Y-m-d H:i:s' ),
			],
			[ '%d', '%s', '%s', '%s', '%s', '%s', '%d', '%d', '%s' ]
		);

		if ( false === $result ) {
			throw new \RuntimeException( 'Failed to insert response: ' . esc_html( $wpdb->last_error ) );
		}

		return Response::reconstitute(
			id: (int) $wpdb->insert_id,
			surveyId: $response->getSurveyId(),
			responseData: $response->getResponseData(),
			score: $response->getScore(),
			pageUrl: $response->getPageUrl(),
			deviceType: $response->getDeviceType(),
			ipHash: $response->getIpHash(),
			userId: $response->getUserId(),
			consentGiven: $response->isConsentGiven(),
			createdAt: $response->getCreatedAt(),
		);
	}

	/**
	 * Retrieve a single Response by its primary key, or null if not found.
	 *
	 * @since 1.0.0
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
	 * @return Response[]
	 * @since 1.0.0
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
	 * @since 1.0.0
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
	 * @return Response[]
	 * @since 1.0.0
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
	 * @since 1.0.0
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
	 * Permanently remove a single Response by its primary key.
	 *
	 * @since 1.0.0
	 */
	public function delete( int $id ): bool {
		global $wpdb;
		return $wpdb->delete( $this->table, [ 'id' => $id ], [ '%d' ] ) !== false;
	}

	/**
	 * Permanently remove all Responses belonging to a given Survey.
	 *
	 * @since 1.0.0
	 */
	public function deleteBySurveyId( int $surveyId ): bool {
		global $wpdb;
		$result = $wpdb->delete( $this->table, [ 'survey_id' => $surveyId ], [ '%d' ] );
		return $result !== false;
	}

	/**
	 * Return true if a response from the given IP hash already exists for
	 * the survey within the look-back window.
	 *
	 * @param int    $surveyId    Survey to check against.
	 * @param string $ipHash      HMAC hash of the visitor IP.
	 * @param int    $windowHours Look-back window in hours (0 = all-time).
	 * @since 1.0.0
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
	 * Hydrate a Response aggregate from a raw database row.
	 *
	 * @param array<string, mixed> $row Raw associative array from wpdb.
	 * @since 1.0.0
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
			userId: isset( $row['user_id'] ) && $row['user_id'] !== null ? (int) $row['user_id'] : null,
			consentGiven: (bool) ( $row['consent_given'] ?? false ),
			createdAt: new DateTimeImmutable( (string) $row['created_at'] ),
		);
	}

	/**
	 * Build the WHERE conditions and parameter list for a response query.
	 *
	 * @return array{0: string[], 1: mixed[]}
	 * @since 1.0.0
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
	 * @return array{0: string[], 1: mixed[]}
	 * @since 1.0.0
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
	 * @since 1.0.0
	 */
	private function decodeJson( string $json ): array {
		if ( $json === '' ) {
			return [];
		}

		$decoded = json_decode( $json, true );
		return is_array( $decoded ) ? $decoded : [];
	}
}
