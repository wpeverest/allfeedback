<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\PostTypes;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Traits\Hooks;

/**
 * Abstract base for all AllFeedback custom post type registrations.
 *
 * Concrete subclasses declare the post type slug, labels, and any args that
 * override the defaults.  The shared register() method merges defaults with
 * subclass args and calls register_post_type().
 *
 * @since 1.0.0
 */
abstract class PostType {

	use Hooks;

	/**
	 * Return the post type slug.
	 *
	 * @since 1.0.0
	 */
	abstract protected function getPostType(): string;

	/**
	 * Return the labels array for this post type.
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
	 * Register the post type with WordPress.
	 *
	 * @since 1.0.0
	 */
	public function register(): void {
		register_post_type(
			$this->getPostType(),
			wp_parse_args( $this->getArgs(), $this->getDefaultArgs() )
		);
	}

	/**
	 * Return sensible defaults shared by all AllFeedback post types.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	protected function getDefaultArgs(): array {
		return [
			'labels'             => $this->getLabels(),
			'public'             => false,
			'publicly_queryable' => false,
			'show_ui'            => false,
			'show_in_menu'       => false,
			'query_var'          => true,
			'capability_type'    => 'post',
			'has_archive'        => false,
			'hierarchical'       => false,
			'supports'           => [ 'title', 'editor' ],
			'show_in_rest'       => false,
		];
	}

	/**
	 * Return the WP_Post_Type object for this post type, or null when not registered.
	 *
	 * @since 1.0.0
	 */
	public function getPostTypeObject(): ?\WP_Post_Type {
		return get_post_type_object( $this->getPostType() );
	}
}
