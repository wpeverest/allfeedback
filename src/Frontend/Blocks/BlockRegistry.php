<?php

declare(strict_types=1);

namespace AllFeedback\Frontend\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Immutable registry of all Gutenberg blocks for this plugin.
 *
 * Blocks are resolved by the factory in config/services.php from the
 * 'block.classes' array.  To add a new block, add its class to that
 * array — this class and FrontendServiceProvider never need to change.
 *
 * @since 1.0.0
 */
final class BlockRegistry {

	/** @var AbstractBlock[] */
	private array $blocks;

	/**
	 * @param AbstractBlock ...$blocks All block instances to register.
	 * @since 1.0.0
	 */
	public function __construct( AbstractBlock ...$blocks ) {
		$this->blocks = $blocks;
	}

	/**
	 * @return AbstractBlock[]
	 * @since 1.0.0
	 */
	public function all(): array {
		return $this->blocks;
	}
}
