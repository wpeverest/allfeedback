<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\PostTypes;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the `allfeedback_survey` custom post type.
 *
 * This CPT backs the survey management SPA in the WordPress admin.
 * It is not publicly queryable — all front-end delivery is handled by the
 * AllFeedback widget via REST API, not through WP template rendering.
 *
 * @since 1.0.0
 */
class Survey extends PostType {

	/**
	 * @since 1.0.0
	 */
	protected function getPostType(): string {
		return 'allfeedback_survey';
	}

	/**
	 * @return array<string, string>
	 * @since 1.0.0
	 */
	protected function getLabels(): array {
		return [
			'name'               => __( 'Surveys', 'all-feedback' ),
			'singular_name'      => __( 'Survey', 'all-feedback' ),
			'menu_name'          => __( 'Surveys', 'all-feedback' ),
			'add_new'            => __( 'Add New', 'all-feedback' ),
			'add_new_item'       => __( 'Add New Survey', 'all-feedback' ),
			'edit_item'          => __( 'Edit Survey', 'all-feedback' ),
			'new_item'           => __( 'New Survey', 'all-feedback' ),
			'view_item'          => __( 'View Survey', 'all-feedback' ),
			'search_items'       => __( 'Search Surveys', 'all-feedback' ),
			'not_found'          => __( 'No surveys found', 'all-feedback' ),
			'not_found_in_trash' => __( 'No surveys found in trash', 'all-feedback' ),
		];
	}

	/**
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	protected function getArgs(): array {
		return [
			'public'          => false,
			'show_ui'         => false,
			'show_in_menu'    => false,
			'map_meta_cap'    => true,
			'has_archive'     => false,
			'show_in_rest'    => true,
			'capability_type' => [ 'allfeedback_survey', 'allfeedback_surveys' ],
			'supports'        => [ 'title', 'editor', 'thumbnail' ],
			'taxonomies'      => [ 'allfeedback_category' ],
		];
	}
}
