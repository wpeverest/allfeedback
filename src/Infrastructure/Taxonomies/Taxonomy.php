<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Taxonomies;

defined( 'ABSPATH' ) || exit;

/**
 * Abstract base for all AllFeedback taxonomy registrations.
 *
 * Concrete subclasses declare the taxonomy slug, the post types it attaches to,
 * labels, and any args that override the defaults.  The shared register() method
 * merges defaults with subclass args and calls register_taxonomy().
 *
 * @since 1.0.0
 */
abstract class Taxonomy {

	/**
	 * Return the taxonomy slug.
	 *
	 * @since 1.0.0
	 */
	abstract protected function getTaxonomy(): string;

	/**
	 * Return the post type slugs this taxonomy should attach to.
	 *
	 * @return string[]
	 * @since 1.0.0
	 */
	abstract protected function getObjectTypes(): array;

	/**
	 * Return the labels array for this taxonomy.
	 *
	 * @return array<string, string>
	 * @since 1.0.0
	 */
	abstract protected function getLabels(): array;

	/**
	 * Return any args that override or extend the defaults.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	abstract protected function getArgs(): array;

	/**
	 * Register the taxonomy with WordPress.
	 *
	 * @since 1.0.0
	 */
	public function register(): void {
		register_taxonomy(
			$this->getTaxonomy(),
			$this->getObjectTypes(),
			wp_parse_args( $this->getArgs(), $this->getDefaultArgs() )
		);
	}

	/**
	 * Return sensible defaults shared by all AllFeedback taxonomies.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	protected function getDefaultArgs(): array {
		return [
			'labels'            => $this->getLabels(),
			'public'            => false,
			'publicly_queryable' => false,
			'show_ui'           => false,
			'show_in_menu'      => false,
			'show_in_nav_menus' => false,
			'show_tagcloud'     => false,
			'show_in_rest'      => false,
			'hierarchical'      => false,
			'query_var'         => true,
			'rewrite'           => false,
		];
	}

	/**
	 * Return the WP_Taxonomy object for this taxonomy, or null when not registered.
	 *
	 * @since 1.0.0
	 */
	public function getTaxonomyObject(): ?\WP_Taxonomy {
		return get_taxonomy( $this->getTaxonomy() );
	}
}
