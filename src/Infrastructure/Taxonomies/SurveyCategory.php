<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Taxonomies;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the `allfeedback_category` taxonomy for the `allfeedback_survey` post type.
 *
 * Used to organise surveys into admin-defined categories (e.g. "NPS Campaigns",
 * "Checkout Feedback") for filtering and reporting purposes.
 *
 * @since 1.0.0
 */
class SurveyCategory extends Taxonomy {

	/**
	 * @since 1.0.0
	 */
	protected function getTaxonomy(): string {
		return 'allfeedback_category';
	}

	/**
	 * @return string[]
	 * @since 1.0.0
	 */
	protected function getObjectTypes(): array {
		return [ 'allfeedback_survey' ];
	}

	/**
	 * @return array<string, string>
	 * @since 1.0.0
	 */
	protected function getLabels(): array {
		return [
			'name'              => __( 'Survey Categories', 'all-feedback' ),
			'singular_name'     => __( 'Survey Category', 'all-feedback' ),
			'menu_name'         => __( 'Survey Categories', 'all-feedback' ),
			'all_items'         => __( 'All Survey Categories', 'all-feedback' ),
			'edit_item'         => __( 'Edit Survey Category', 'all-feedback' ),
			'view_item'         => __( 'View Survey Category', 'all-feedback' ),
			'update_item'       => __( 'Update Survey Category', 'all-feedback' ),
			'add_new_item'      => __( 'Add New Survey Category', 'all-feedback' ),
			'new_item_name'     => __( 'New Survey Category Name', 'all-feedback' ),
			'parent_item'       => __( 'Parent Category', 'all-feedback' ),
			'parent_item_colon' => __( 'Parent Category:', 'all-feedback' ),
			'search_items'      => __( 'Search Survey Categories', 'all-feedback' ),
			'not_found'         => __( 'No survey categories found', 'all-feedback' ),
		];
	}

	/**
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	protected function getArgs(): array {
		return [
			'hierarchical' => true,
			'show_in_rest' => false,
		];
	}
}
