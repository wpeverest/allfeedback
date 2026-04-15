<?php

declare(strict_types=1);

namespace AllFeedback\Frontend\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Holds every registered block for this plugin.
 *
 * Adding a new block
 * ──────────────────
 * Pass the new block class as an additional argument in config/services.php:
 *
 *   BlockRegistry::class => create( BlockRegistry::class )
 *       ->constructor( get( SurveyBlock::class ), get( MyNewBlock::class ) ),
 *
 * FrontendServiceProvider does NOT need to change.
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
