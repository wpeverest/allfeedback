<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Support\Logger;

/**
 * Class LogsController
 *
 * REST controller for plugin log file management.
 *
 * Routes (under all-feedback/v1):
 *   GET    /logs              → index()        : paginated list of log files
 *   GET    /logs/{id}        → show()         : single log file with full content
 *   DELETE /logs/delete      → bulkDelete()   : bulk-delete multiple log files
 *   DELETE /logs/{id}        → destroy()      : delete a single log file
 *
 * Note: /logs/delete is registered before /logs/{id} so the literal segment
 * "delete" is matched first by WordPress's router.
 *
 * ── Log file identity ─────────────────────────────────────────────────────
 *
 * Each log file is identified by its stem without the .log extension.
 * Example: file "allfeedback-2026-04-13.log" → id "allfeedback-2026-04-13".
 *
 * The id is URL-safe (lowercase, hyphens) so no encoding is needed.
 *
 * ── Security ─────────────────────────────────────────────────────────────
 *
 * All routes require manage_options. Log content is never exposed as a
 * direct file URL — it is served exclusively through this controller so
 * WordPress authentication always gates access.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class LogsController extends RestController {

	/**
	 * REST resource slug.
	 *
	 * @since 1.0.0
	 */
	protected string $restBase = 'logs';

	/**
	 * @param Logger $logger Plugin logger (provides logDir() and entry count helpers).
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly Logger $logger,
	) {}

	/**
	 * Register all routes for this controller.
	 *
	 * @since 1.0.0
	 */
	public function registerRoutes(): void {
		// GET /logs — list all log files.
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase,
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => array_merge(
						$this->paginationArgs( 20, 100 ),
						[
							'orderby' => $this->argEnum(
								__( 'Sort log files by attribute.', 'all-feedback' ),
								[ 'date', 'name', 'size' ],
								default: 'date',
							),
							'order'   => $this->argEnum(
								__( 'Sort direction.', 'all-feedback' ),
								[ 'asc', 'desc' ],
								default: 'desc',
							),
							'search'  => $this->argString(
								__( 'Filter log files by filename.', 'all-feedback' ),
								default: '',
							),
						]
					),
				],
			]
		);

		// DELETE /logs/delete — bulk-delete multiple log files.
		// Must be registered before /logs/{id} to prevent "delete" being
		// treated as an id parameter.
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/delete',
			[
				[
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'bulkDelete' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => [
						'ids' => [
							'description'       => __( 'Array of log file IDs to delete.', 'all-feedback' ),
							'type'              => 'array',
							'items'             => [ 'type' => 'string' ],
							'required'          => true,
							'minItems'          => 1,
							'validate_callback' => 'rest_validate_request_arg',
						],
					],
				],
			]
		);

		// GET /logs/{id}, DELETE /logs/{id} — single log file operations.
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/(?P<id>[a-z0-9_-]+)',
			[
				'args' => [
					'id' => [
						'description'       => __( 'Log file ID (filename stem without .log extension).', 'all-feedback' ),
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_file_name',
						'validate_callback' => 'rest_validate_request_arg',
					],
				],
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'show' ],
					'permission_callback' => [ $this, 'adminPermission' ],
				],
				[
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'destroy' ],
					'permission_callback' => [ $this, 'adminPermission' ],
				],
			]
		);
	}

	// ------------------------------------------------------------------
	// Route handlers
	// ------------------------------------------------------------------

	/**
	 * GET /all-feedback/v1/logs
	 *
	 * Return a paginated, filterable list of log files.
	 * Each item includes metadata but not the raw log content.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response
	 * @since 1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response {
		$page    = (int) $request->get_param( 'page' );
		$perPage = (int) $request->get_param( 'per_page' );
		$orderby = (string) $request->get_param( 'orderby' );
		$order   = (string) $request->get_param( 'order' );
		$search  = (string) $request->get_param( 'search' );

		$files = $this->getLogFiles();

		// Filter by search keyword (matches against the filename).
		if ( $search !== '' ) {
			$files = array_filter(
				$files,
				static fn( string $f ) => stripos( basename( $f ), $search ) !== false,
			);
		}

		// Sort.
		usort(
			$files,
			static function ( string $a, string $b ) use ( $orderby, $order ): int {
				$result = match ( $orderby ) {
					'size' => filesize( $a ) - filesize( $b ),
					'name' => strcmp( basename( $a ), basename( $b ) ),
					default => filemtime( $a ) - filemtime( $b ),
				};
				return $order === 'asc' ? $result : -$result;
			}
		);

		$files = array_values( $files );
		$total = count( $files );
		$pages = (int) ceil( $total / $perPage );

		// Paginate.
		$files = array_slice( $files, ( $page - 1 ) * $perPage, $perPage );

		return $this->successResponse( [
			'logs'  => array_map( [ $this, 'prepareItem' ], $files ),
			'total' => $total,
			'page'  => $page,
			'pages' => $pages,
		] );
	}

	/**
	 * GET /all-feedback/v1/logs/{id}
	 *
	 * Return metadata and the full content of a single log file.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function show( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$file = $this->resolveFile( (string) $request->get_param( 'id' ) );

		if ( $file === null ) {
			return $this->notFoundResponse( __( 'Log file', 'all-feedback' ) );
		}

		$item            = $this->prepareItem( $file );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$item['content'] = file_get_contents( $file ) ?: '';

		return $this->successResponse( $item );
	}

	/**
	 * DELETE /all-feedback/v1/logs/{id}
	 *
	 * Permanently delete a single log file.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function destroy( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$id   = (string) $request->get_param( 'id' );
		$file = $this->resolveFile( $id );

		if ( $file === null ) {
			return $this->notFoundResponse( __( 'Log file', 'all-feedback' ) );
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_unlink
		if ( ! unlink( $file ) ) {
			return $this->errorResponse( __( 'Failed to delete log file.', 'all-feedback' ), 500 );
		}

		return $this->successResponse( [ 'deleted' => true, 'id' => $id ] );
	}

	/**
	 * DELETE /all-feedback/v1/logs/delete
	 *
	 * Bulk-delete multiple log files in a single request.
	 *
	 * Always returns 200 — inspect `deleted`, `skipped`, and `failed`
	 * in the response body to detect partial failures.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function bulkDelete( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		/** @var string[] $ids */
		$ids = $request->get_param( 'ids' );

		if ( empty( $ids ) || ! is_array( $ids ) ) {
			return $this->errorResponse( __( 'No log IDs provided.', 'all-feedback' ), 422 );
		}

		$deleted = [];
		$skipped = [];
		$failed  = [];

		foreach ( $ids as $id ) {
			$id   = sanitize_file_name( (string) $id );
			$file = $this->resolveFile( $id );

			if ( $file === null ) {
				$skipped[] = $id;
				continue;
			}

			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_unlink
			if ( unlink( $file ) ) {
				$deleted[] = $id;
			} else {
				$failed[] = $id;
			}
		}

		return $this->successResponse( [
			'deleted' => $deleted,
			'skipped' => $skipped,
			'failed'  => $failed,
		] );
	}

	// ------------------------------------------------------------------
	// Helpers
	// ------------------------------------------------------------------

	/**
	 * Return all .log files in the log directory, sorted by modification time
	 * descending by default (most recent first).
	 *
	 * @return string[] Absolute file paths.
	 * @since 1.0.0
	 */
	private function getLogFiles(): array {
		$files = glob( $this->logger->logDir() . '/allfeedback-*.log' );
		return is_array( $files ) ? $files : [];
	}

	/**
	 * Resolve a log file ID to its absolute path, or null if not found.
	 *
	 * Security: path is validated to be inside the log directory so that a
	 * crafted ID (e.g. "../../wp-config") cannot escape the directory.
	 *
	 * @param string $id Log file stem (filename without .log extension).
	 * @return string|null Absolute path, or null if not found / outside log dir.
	 * @since 1.0.0
	 */
	private function resolveFile( string $id ): ?string {
		$logDir = realpath( $this->logger->logDir() );

		if ( $logDir === false ) {
			return null;
		}

		$file = realpath( $logDir . '/' . $id . '.log' );

		if ( $file === false || strpos( $file, $logDir ) !== 0 || ! is_file( $file ) ) {
			return null;
		}

		return $file;
	}

	/**
	 * Build the metadata array for a single log file.
	 *
	 * @param string $file Absolute path to the log file.
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	private function prepareItem( string $file ): array {
		$bytes   = (int) filesize( $file );
		$kb      = round( $bytes / 1024, 2 );
		$entries = $this->countEntries( $file );

		return [
			'id'      => basename( $file, '.log' ),
			'name'    => basename( $file ),
			'size'    => $kb . ' KB',
			'bytes'   => $bytes,
			'entries' => $entries,
			'date'    => gmdate( 'c', (int) filemtime( $file ) ),
		];
	}

	/**
	 * Count the number of log entries (lines) in a file.
	 *
	 * Each entry is exactly one line, so line count = entry count.
	 * Uses a memory-efficient line counter rather than loading the file.
	 *
	 * @param string $file Absolute path to the log file.
	 * @return int
	 * @since 1.0.0
	 */
	private function countEntries( string $file ): int {
		$count  = 0;
		$handle = @fopen( $file, 'r' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen

		if ( ! is_resource( $handle ) ) {
			return 0;
		}

		while ( ! feof( $handle ) ) {
			$line = fgets( $handle );
			if ( $line !== false && trim( $line ) !== '' ) {
				++$count;
			}
		}

		fclose( $handle ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose

		return $count;
	}
}
