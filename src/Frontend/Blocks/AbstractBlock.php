<?php
/**
 * Abstract block.
 *
 * @package AllFeedback\Frontend\Blocks
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Frontend\Blocks;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Constants;

/**
 * Base class for all allfeedback/* Gutenberg blocks.
 *
 * How to add a new block
 * ──────────────────────
 * 1. Create  resources/scripts/blocks/{slug}/block.json  (editor_script: "file:../../../build/blocks.js")
 * 2. Create  resources/scripts/blocks/{slug}/Edit.tsx + index.ts  (exports Edit + metadata from ./block.json)
 * 3. Add     import * as {slug} from './{slug}'  to resources/scripts/blocks/index.ts
 * 4. Create  src/Frontend/Blocks/{Name}Block.php  (extend this class, getSlug() returns '{slug}')
 * 5. In config/services.php:
 *      a. Add  {Name}Block::class => autowire()
 *      b. Add  {Name}Block::class  to the 'block.classes' array
 *
 * webpack.config.js, BlockRegistry, and FrontendServiceProvider never change.
 *
 * @package AllFeedback\Frontend\Blocks
 * @since   1.0.0
 */
abstract class AbstractBlock {

	/**
	 * The block folder name inside resources/scripts/blocks/.
	 *
	 * Must match the folder name: resources/scripts/blocks/{slug}/block.json.
	 * Example: "survey" for the folder resources/scripts/blocks/survey/.
	 *
	 * @return string
	 * @since  1.0.0
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
	 * @since  1.0.0
	 */
	abstract public function render( array $attributes ): string;

	/**
	 * Register the block type with WordPress.
	 *
	 * Reads block.json from blocks/{slug}/, supplies this class as the render
	 * callback, then calls afterRegister() so subclasses can inject editor data
	 * via wp_add_inline_script or perform other post-registration work.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	final public function register(): void {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		$block_dir = Constants::path( 'resources/scripts/blocks/' . $this->getSlug() );

		if ( ! is_dir( $block_dir ) || ! file_exists( $block_dir . '/block.json' ) ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_trigger_error -- internal developer warning
			trigger_error(
				sprintf(
					'AllFeedback block "%s": expected block.json at %s/block.json',
					static::class,
					$block_dir // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- internal server path, not rendered as HTML
				),
				E_USER_WARNING
			);
			return;
		}

		$block_type = register_block_type(
			$block_dir,
			[ 'render_callback' => [ $this, 'render' ] ]
		);

		if ( $block_type instanceof \WP_Block_Type ) {
			$this->afterRegister( $block_type );
		}
	}

	/**
	 * Called immediately after successful block registration.
	 *
	 * Override in subclasses to inject editor-side data, e.g.:
	 *
	 *   wp_add_inline_script($block_type->editor_script_handles[0], '...', 'before');
	 *
	 * @param  \WP_Block_Type $block_type Registered block type object.
	 * @return void
	 * @since  1.0.0
	 */
	protected function afterRegister( \WP_Block_Type $block_type ): void {}
}
