<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;

/**
 * Class ContentSearchController
 *
 * Provides a unified search endpoint over published pages and posts.
 * Powers the "Select specific pages & posts" targeting picker in the form builder.
 *
 * Route: GET /all-feedback/v1/content-search
 *
 * Pro add-ons can extend the searchable post types and modify the underlying
 * WP_Query args via the filters documented on each method.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class ContentSearchController extends RestController {

	/**
	 * REST resource slug.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $restBase = 'content-search';

	/**
	 * Register routes.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase,
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'search' ],
				'permission_callback' => [ $this, 'adminPermission' ],
				'args'                => $this->searchArgs(),
				'schema'              => [ $this, 'getPublicItemSchema' ],
			]
		);
	}

	/**
	 * GET /all-feedback/v1/content-search
	 *
	 * Search published pages and posts for the page targeting picker.
	 * Runs a paginated WP_Query across the resolved post types, ordered
	 * alphabetically by title. Works for both empty and keyword searches.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response
	 * @since  1.0.0
	 */
	public function search( \WP_REST_Request $request ): \WP_REST_Response {
		$search    = sanitize_text_field( (string) ( $request->get_param( 'search' ) ?? '' ) );
		$page      = max( 1, (int) ( $request->get_param( 'page' )     ?? 1 ) );
		$perPage   = min( 50, max( 1, (int) ( $request->get_param( 'per_page' ) ?? 20 ) ) );
		$offset    = ( $page - 1 ) * $perPage;
		$postTypes = $this->resolvePostTypes( (string) ( $request->get_param( 'post_type' ) ?? '' ) );

		$queryArgs = apply_filters(
			'allfeedback_content_search_query_args',
			[
				'post_type'              => $postTypes,
				'post_status'            => 'publish',
				's'                      => $search,
				'posts_per_page'         => $perPage,
				'offset'                 => $offset,
				'orderby'                => 'title',
				'order'                  => 'ASC',
				'no_found_rows'          => false,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			],
			$request
		);

		$query = new \WP_Query( $queryArgs );
		$total = (int) $query->found_posts;

		$items = array_map(
			fn ( \WP_Post $post ): array => $this->prepareItem( $post ),
			$query->posts
		);

		return $this->successResponse(
			[
				'items'    => $items,
				'total'    => $total,
				'page'     => $page,
				'per_page' => $perPage,
			]
		);
	}

	/**
	 * JSON schema for a single content-search item.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	public function getPublicItemSchema(): array {
		return [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'allfeedback_content_item',
			'type'       => 'object',
			'properties' => [
				'id'    => [
					'description' => __( 'WordPress post/page ID.', 'all-feedback' ),
					'type'        => 'integer',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'title' => [
					'description' => __( 'Decoded post title.', 'all-feedback' ),
					'type'        => 'string',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'type'  => [
					'description' => __( 'WordPress post type slug.', 'all-feedback' ),
					'type'        => 'string',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'url'   => [
					'description' => __( 'Permalink of the page or post.', 'all-feedback' ),
					'type'        => 'string',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
			],
		];
	}

	/**
	 * Resolve the post types to search.
	 *
	 * Accepts a comma-separated string from the request, intersects it with
	 * the list of allowed post types, and falls back to all allowed types when
	 * the intersection is empty.
	 *
	 * @param  string $rawParam Raw post_type query param value.
	 * @return string[]
	 * @since  1.0.0
	 */
	private function resolvePostTypes( string $rawParam ): array {
		$allowed = (array) apply_filters( 'allfeedback_content_search_post_types', [ 'page', 'post' ] );

		if ( $rawParam === '' ) {
			return $allowed;
		}

		$requested = array_filter(
			array_map( 'sanitize_key', explode( ',', $rawParam ) )
		);

		$intersected = array_values( array_intersect( $requested, $allowed ) );

		return $intersected !== [] ? $intersected : $allowed;
	}

	/**
	 * Serialize a WP_Post into the response item shape.
	 *
	 * @param  \WP_Post $post The post object to serialize.
	 * @return array{id: int, title: string, type: string, url: string}
	 * @since  1.0.0
	 */
	private function prepareItem( \WP_Post $post ): array {
		return [
			'id'    => $post->ID,
			'title' => html_entity_decode( get_the_title( $post ), ENT_QUOTES, 'UTF-8' ),
			'type'  => $post->post_type,
			'url'   => get_permalink( $post ) ?: '',
		];
	}

	/**
	 * Query-string arguments for GET /content-search.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function searchArgs(): array {
		return array_merge(
			$this->paginationArgs( defaultPerPage: 20, maxPerPage: 50 ),
			[
				'search'    => $this->argString(
					description: __( 'Keyword to filter pages/posts by title.', 'all-feedback' ),
					default:     '',
				),
				'post_type' => $this->argString(
					description: __( 'Comma-separated post type slugs to include. Defaults to all allowed types.', 'all-feedback' ),
					default:     '',
				),
			]
		);
	}
}
