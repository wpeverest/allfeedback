<?php

declare(strict_types=1);

namespace AllFeedback\Frontend\Blocks;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Constants;

/**
 * Base class for all allfeedback/* Gutenberg blocks.
 *
 * How to add a new block
 * ──────────────────────
 * 1. Create  blocks/{slug}/block.json
 *            (editorScript: "file:../../resources/build/block-{slug}.js")
 * 2. Create  resources/scripts/blocks/{slug}/index.tsx
 * 3. Add a webpack entry in webpack.config.js:
 *            'block-{slug}': resolve(..., 'resources/scripts/blocks/{slug}/index.tsx')
 * 4. Create  src/Frontend/Blocks/{Name}Block.php  (extend AbstractBlock)
 * 5. Add     {Name}Block::class => autowire()  to config/services.php
 * 6. Add the class to FrontendServiceProvider::$blocks[]
 *
 * That's it — no changes to FrontendServiceProvider beyond step 6.
 *
 * @since 1.0.0
 */
abstract class AbstractBlock {

	/**
	 * The block directory slug inside /blocks/.
	 *
	 * Must match the folder name: blocks/{slug}/block.json.
	 * Example: "allfb-survey" for the folder blocks/allfb-survey/.
	 *
	 * @since 1.0.0
	 */
	abstract protected function getSlug(): string;

	/**
	 * PHP render callback — server-side output for the block.
	 *
	 * Return the HTML string that WordPress inserts into the page, or an
	 * empty string to render nothing (e.g. unpublished content).
	 *
	 * @param  array<string, mixed> $attributes Block attributes from block.json.
	 * @return string
	 * @since 1.0.0
	 */
	abstract public function render( array $attributes ): string;

	/**
	 * Register the block type with WordPress.
	 *
	 * Reads block.json from blocks/{slug}/, supplies this class as the render
	 * callback, then calls afterRegister() so subclasses can inject editor data
	 * via wp_add_inline_script or perform other post-registration work.
	 *
	 * @since 1.0.0
	 */
	final public function register(): void {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		$blockType = register_block_type(
			Constants::path( 'blocks/' . $this->getSlug() ),
			[ 'render_callback' => [ $this, 'render' ] ]
		);

		if ( $blockType instanceof \WP_Block_Type ) {
			$this->afterRegister( $blockType );
		}
	}

	/**
	 * Called immediately after successful block registration.
	 *
	 * Override in subclasses to inject editor-side data, e.g.:
	 *
	 *   wp_add_inline_script($blockType->editor_script_handles[0], '...', 'before');
	 *
	 * @param  \WP_Block_Type $blockType Registered block type object.
	 * @since 1.0.0
	 */
	protected function afterRegister( \WP_Block_Type $blockType ): void {}
}
