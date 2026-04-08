<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Survey\Manager;

/**
 * Class ResponsesController
 *
 * REST controller for survey responses.
 *
 * Routes registered (all under all-feedback/v1):
 *   POST /surveys/{id}/responses  → store()  : public submission with nonce validation
 *   GET  /surveys/{id}/responses  → index()  : paginated response list (admin only)
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class ResponsesController extends RestController {

	/**
	 * @since 1.0.0
	 */
	protected string $restBase = 'surveys';

	/**
	 * Nonce action used to authenticate frontend widget submissions.
	 *
	 * @since 1.0.0
	 */
	private const NONCE_ACTION = 'allfeedback_submit';

	/**
	 * Bare table name for responses (without the WordPress prefix).
	 *
	 * @since 1.0.0
	 */
	private const TABLE_RESPONSES = 'af_responses';

	/**
	 * @param Manager $surveyManager Table gateway for the af_surveys table.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly Manager $surveyManager,
	) {}

	/**
	 * Register all routes for this controller.
	 *
	 * @since 1.0.0
	 */
	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>\d+)/responses',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge(
						$this->idArg(),
						$this->paginationArgs( defaultPerPage: 20, maxPerPage: 100 ),
						[
							'date_from' => $this->argString(
								description: __( 'Filter responses created on or after this date (Y-m-d).', 'all-feedback' ),
							),
							'date_to'   => $this->argString(
								description: __( 'Filter responses created on or before this date (Y-m-d).', 'all-feedback' ),
							),
						]
					),
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'store' ],
					'permission_callback' => '__return_true',
					'args'                => array_merge(
						$this->idArg(),
						[
							'response_data' => [
								'description'       => __( 'Field answers keyed by field ID.', 'all-feedback' ),
								'type'              => 'object',
								'required'          => true,
								'sanitize_callback' => null,
								'validate_callback' => 'rest_validate_request_arg',
							],
							'score'         => $this->argInteger(
								description: __( 'Numeric score for NPS, CSAT, or CES fields.', 'all-feedback' ),
								min:         0,
								max:         10,
							),
							'page_url'      => $this->argString(
								description: __( 'URL of the page where the survey was displayed.', 'all-feedback' ),
								maxLength:   2083,
							),
							'device_type'   => $this->argEnum(
								description: __( 'Visitor device type at submission time.', 'all-feedback' ),
								values:      [ 'desktop', 'tablet', 'mobile' ],
							),
							'nonce'         => $this->argString(
								description: __( 'WordPress nonce for submission authentication.', 'all-feedback' ),
								required:    true,
							),
							'consent_given' => $this->argBoolean(
								description: __( 'Whether the visitor gave GDPR consent.', 'all-feedback' ),
								default:     false,
							),
						]
					),
				],
			]
		);
	}

	// ------------------------------------------------------------------
	// Route handlers
	// ------------------------------------------------------------------

	/**
	 * GET /all-feedback/v1/surveys/{id}/responses
	 *
	 * Return a paginated list of responses for a survey.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$surveyId = (int) $request->get_param( 'id' );

		if ( $this->surveyManager->find( $surveyId ) === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		$page     = max( 1, (int) ( $request->get_param( 'page' ) ?? 1 ) );
		$perPage  = min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?? 20 ) ) );
		$offset   = ( $page - 1 ) * $perPage;
		$dateFrom = sanitize_text_field( (string) ( $request->get_param( 'date_from' ) ?? '' ) );
		$dateTo   = sanitize_text_field( (string) ( $request->get_param( 'date_to' ) ?? '' ) );

		[ $responses, $total ] = $this->queryResponses( $surveyId, $perPage, $offset, $dateFrom, $dateTo );

		return $this->successResponse(
			[
				'responses' => array_map( [ $this, 'prepareResponse' ], $responses ),
				'total'     => $total,
				'page'      => $page,
				'per_page'  => $perPage,
			]
		);
	}

	/**
	 * POST /all-feedback/v1/surveys/{id}/responses
	 *
	 * Accept a frontend widget submission.
	 *
	 * Validates the nonce, checks for duplicate submission via IP hash,
	 * persists the response, and increments the survey's cached response count.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function store( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$nonce = sanitize_text_field( (string) ( $request->get_param( 'nonce' ) ?? '' ) );

		if ( ! wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
			return $this->errorResponse( __( 'Invalid or expired nonce.', 'all-feedback' ), 403 );
		}

		$surveyId = (int) $request->get_param( 'id' );
		$survey   = $this->surveyManager->find( $surveyId );

		if ( $survey === null ) {
			return $this->notFoundResponse( __( 'Survey', 'all-feedback' ) );
		}

		if ( $survey->status !== 'published' ) {
			return $this->errorResponse( __( 'This survey is not currently accepting responses.', 'all-feedback' ), 403 );
		}

		$ipHash = $this->hashIp();

		if ( $this->isDuplicateSubmission( $surveyId, $ipHash ) ) {
			return $this->errorResponse( __( 'A response from this visitor has already been recorded.', 'all-feedback' ), 409 );
		}

		$responseData = $request->get_param( 'response_data' );
		$score        = $request->get_param( 'score' );
		$pageUrl      = esc_url_raw( (string) ( $request->get_param( 'page_url' ) ?? '' ) );
		$deviceType   = sanitize_key( (string) ( $request->get_param( 'device_type' ) ?? '' ) );
		$consent      = (bool) $request->get_param( 'consent_given' );

		$newId = $this->insertResponse(
			[
				'survey_id'     => $surveyId,
				'response_data' => wp_json_encode( $responseData ),
				'score'         => $score !== null ? (int) $score : null,
				'page_url'      => $pageUrl !== '' ? $pageUrl : null,
				'device_type'   => $deviceType !== '' ? $deviceType : null,
				'ip_hash'       => $ipHash,
				'user_id'       => is_user_logged_in() ? get_current_user_id() : null,
				'consent_given' => $consent ? 1 : 0,
				'created_at'    => current_time( 'mysql' ),
			]
		);

		if ( $newId === false ) {
			return $this->errorResponse( __( 'Failed to save response.', 'all-feedback' ), 500 );
		}

		$this->surveyManager->incrementResponseCount( $surveyId );

		return $this->successResponse( [ 'id' => $newId ], 201 );
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Fetch a paginated set of responses for a survey plus the total count.
	 *
	 * Returns a two-element array: [ object[] $rows, int $total ].
	 *
	 * @param int    $surveyId Survey primary key.
	 * @param int    $perPage  Maximum rows to return.
	 * @param int    $offset   Number of rows to skip.
	 * @param string $dateFrom Optional lower bound (Y-m-d).
	 * @param string $dateTo   Optional upper bound (Y-m-d).
	 * @return array{ 0: object[], 1: int }
	 * @since 1.0.0
	 */
	private function queryResponses( int $surveyId, int $perPage, int $offset, string $dateFrom, string $dateTo ): array {
		global $wpdb;

		$table      = $wpdb->prefix . self::TABLE_RESPONSES;
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

		$where = 'WHERE ' . implode( ' AND ', $conditions );

		$countValues = $values;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$total = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} {$where}", $countValues ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		$values[] = $perPage;
		$values[] = $offset;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} {$where} ORDER BY created_at DESC LIMIT %d OFFSET %d", $values ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		return [ $rows ?: [], $total ];
	}

	/**
	 * Check whether a response from the same IP already exists for this survey.
	 *
	 * @param int    $surveyId Survey primary key.
	 * @param string $ipHash   Anonymised hashed IP address.
	 * @return bool
	 * @since 1.0.0
	 */
	private function isDuplicateSubmission( int $surveyId, string $ipHash ): bool {
		global $wpdb;

		$table = $wpdb->prefix . self::TABLE_RESPONSES;

		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$exists = $wpdb->get_var(
			$wpdb->prepare( "SELECT id FROM {$table} WHERE survey_id = %d AND ip_hash = %s LIMIT 1", $surveyId, $ipHash ) // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		);

		return $exists !== null;
	}

	/**
	 * Persist a new response row and return the inserted ID.
	 *
	 * @param array<string, mixed> $data Column-value map.
	 * @return int|false
	 * @since 1.0.0
	 */
	private function insertResponse( array $data ): int|false {
		global $wpdb;

		$intCols  = [ 'survey_id', 'score', 'user_id', 'consent_given' ];
		$formats  = [];

		foreach ( array_keys( $data ) as $col ) {
			$formats[] = in_array( $col, $intCols, true ) ? '%d' : '%s';
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$result = $wpdb->insert( $wpdb->prefix . self::TABLE_RESPONSES, $data, $formats );

		if ( $result === false ) {
			return false;
		}

		return (int) $wpdb->insert_id;
	}

	/**
	 * Hash the visitor's IP address for anonymised duplicate detection.
	 *
	 * HMAC-SHA256 with the WordPress auth key as the secret ensures the hash
	 * cannot be reversed to recover the original IP while still being unique
	 * per visitor.
	 *
	 * @return string 64-character hex digest.
	 * @since 1.0.0
	 */
	private function hashIp(): string {
		$ip     = sanitize_text_field( (string) ( $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '' ) );
		$ip     = trim( explode( ',', $ip )[0] );
		$secret = defined( 'AUTH_KEY' ) ? AUTH_KEY : 'allfeedback';

		return hash_hmac( 'sha256', $ip, $secret );
	}

	/**
	 * Serialise a wpdb response row into the REST response shape.
	 *
	 * @param object $response Raw database row.
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	private function prepareResponse( object $response ): array {
		return [
			'id'            => (int) $response->id,
			'survey_id'     => (int) $response->survey_id,
			'response_data' => isset( $response->response_data ) && $response->response_data !== null
				? json_decode( $response->response_data, true )
				: null,
			'score'         => $response->score !== null ? (int) $response->score : null,
			'page_url'      => $response->page_url,
			'device_type'   => $response->device_type,
			'user_id'       => $response->user_id !== null ? (int) $response->user_id : null,
			'consent_given' => (bool) $response->consent_given,
			'created_at'    => $response->created_at,
		];
	}
}
