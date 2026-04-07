<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

use AllFeedback\Core\Constants;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Class SampleController
 *
 * Demonstrates how to build a REST API controller following the AllCoach pattern.
 *
 * Base URL: /wp-json/all-feedback/v1/sample
 *
 * Routes registered:
 *   GET  /sample          → index()   : return a collection
 *   GET  /sample/(?P<id>\d+) → show()  : return a single item
 *   POST /sample          → store()   : create an item
 *
 * Authentication: all write routes require a logged-in user with manage_options.
 * Adjust the permission_callback for your use-case.
 */
class SampleController {

	/** REST API namespace — matches config/app.php#namespace. */
	private const NAMESPACE = 'all-feedback/v1';

	/** Resource slug used in the route base. */
	private const REST_BASE = 'sample';

	/**
	 * Register all routes for this controller.
	 * Called by ApiServiceProvider::registerRoutes() on 'rest_api_init'.
	 */
	public function registerRoutes(): void {
		// ----- Collection endpoint ----------------------------------------
		register_rest_route(
			self::NAMESPACE,
			'/' . self::REST_BASE,
			[
				// GET /sample
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'publicPermission' ],
					'args'                => $this->collectionArgs(),
				],
				// POST /sample
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'store' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => $this->storeArgs(),
				],
			]
		);

		// ----- Single-item endpoint ---------------------------------------
		register_rest_route(
			self::NAMESPACE,
			'/' . self::REST_BASE . '/(?P<id>\d+)',
			[
				// GET /sample/{id}
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'show' ],
					'permission_callback' => [ $this, 'publicPermission' ],
					'args'                => [
						'id' => [
							'description'       => __( 'Unique identifier for the item.', 'all-feedback' ),
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
							'validate_callback' => 'rest_validate_request_arg',
						],
					],
				],
			]
		);
	}

	// ------------------------------------------------------------------
	// Handlers
	// ------------------------------------------------------------------

	/**
	 * GET /all-feedback/v1/sample
	 *
	 * Returns a paginated collection of sample items.
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 */
	public function index( WP_REST_Request $request ): WP_REST_Response {
		// Replace with a real repository / service call.
		$items = [
			[ 'id' => 1, 'name' => __( 'Sample Item One', 'all-feedback' ) ],
			[ 'id' => 2, 'name' => __( 'Sample Item Two', 'all-feedback' ) ],
		];

		return new WP_REST_Response(
			[
				'data'    => $items,
				'total'   => count( $items ),
				'page'    => (int) $request->get_param( 'page' ),
				'perPage' => (int) $request->get_param( 'per_page' ),
			],
			200
		);
	}

	/**
	 * GET /all-feedback/v1/sample/{id}
	 *
	 * Returns a single item by its ID.
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 */
	public function show( WP_REST_Request $request ): WP_REST_Response {
		$id = absint( $request->get_param( 'id' ) );

		// Replace with a real repository lookup.
		$item = [ 'id' => $id, 'name' => sprintf( __( 'Sample Item #%d', 'all-feedback' ), $id ) ];

		if ( empty( $item ) ) {
			return new WP_REST_Response(
				[ 'message' => __( 'Item not found.', 'all-feedback' ) ],
				404
			);
		}

		return new WP_REST_Response( $item, 200 );
	}

	/**
	 * POST /all-feedback/v1/sample
	 *
	 * Create a new item. Body parameters are validated by storeArgs().
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 */
	public function store( WP_REST_Request $request ): WP_REST_Response {
		$name = sanitize_text_field( (string) $request->get_param( 'name' ) );

		// Replace with a real service / repository call.
		$newItem = [
			'id'   => wp_rand( 100, 999 ),
			'name' => $name,
		];

		return new WP_REST_Response( $newItem, 201 );
	}

	// ------------------------------------------------------------------
	// Permission callbacks
	// ------------------------------------------------------------------

	/**
	 * Allow all requests (including unauthenticated).
	 *
	 * Use for read-only, non-sensitive data.
	 */
	public function publicPermission(): bool {
		return true;
	}

	/**
	 * Allow only logged-in administrators.
	 *
	 * Adjust the capability check to match your plugin's role model.
	 */
	public function adminPermission(): bool {
		return current_user_can( 'manage_options' );
	}

	// ------------------------------------------------------------------
	// Argument schemas
	// ------------------------------------------------------------------

	/**
	 * Query-string arguments for GET /sample.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private function collectionArgs(): array {
		return [
			'page'     => [
				'description'       => __( 'Current page number (1-based).', 'all-feedback' ),
				'type'              => 'integer',
				'default'           => 1,
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
				'validate_callback' => 'rest_validate_request_arg',
			],
			'per_page' => [
				'description'       => __( 'Items to return per page.', 'all-feedback' ),
				'type'              => 'integer',
				'default'           => 10,
				'minimum'           => 1,
				'maximum'           => 100,
				'sanitize_callback' => 'absint',
				'validate_callback' => 'rest_validate_request_arg',
			],
		];
	}

	/**
	 * Body arguments for POST /sample.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	private function storeArgs(): array {
		return [
			'name' => [
				'description'       => __( 'Name of the new item.', 'all-feedback' ),
				'type'              => 'string',
				'required'          => true,
				'minLength'         => 1,
				'maxLength'         => 200,
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => 'rest_validate_request_arg',
			],
		];
	}
}
