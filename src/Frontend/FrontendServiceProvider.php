<?php

declare(strict_types=1);

namespace AllFeedback\Frontend;

use AllFeedback\API\Controllers\V1\SubmitController;
use AllFeedback\Core\Container;
use AllFeedback\Core\ServiceProvider;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Frontend\Blocks\BlockRegistry;
use AllFeedback\Support\AssetManager;
use AllFeedback\Traits\Hooks;
use DI\ContainerBuilder;

/**
 * Class FrontendServiceProvider
 *
 * Boots all public-facing functionality:
 *  - Shortcode registration
 *  - Gutenberg block registration (delegated to BlockRegistry)
 *  - Frontend script / style enqueueing
 *
 * Adding a new Gutenberg block
 * ────────────────────────────
 * This class does NOT need to change. See BlockRegistry and AbstractBlock.
 *
 * Adding a new shortcode
 * ──────────────────────
 * 1. Register it in registerShortcodes() with add_shortcode().
 * 2. Create a render method (or delegate to a dedicated class).
 */
class FrontendServiceProvider implements ServiceProvider {

	use Hooks;

	public function __construct(
		private readonly Container $container,
		private readonly AssetManager $assetManager,
		private readonly SettingsManager $settingsManager,
		private readonly TargetingEngine $targetingEngine,
		private readonly BlockRegistry $blockRegistry,
	) {}

	// ServiceProvider::register() — nothing extra to add here.
	public function register( ContainerBuilder $builder ): void {}

	/**
	 * Wire up WordPress hooks for the frontend context.
	 */
	public function boot(): void {
		$this->addAction( 'init',                 [ $this, 'registerShortcodes' ] );
		$this->addAction( 'init',                 [ $this, 'registerBlocks'     ] );
		$this->addFilter( 'block_categories_all', [ $this, 'registerBlockCategory' ], 10, 1 );
		$this->addAction( 'allfeedback:enqueue-assets:frontend', [ $this, 'enqueueAssets' ] );
	}

	// ------------------------------------------------------------------
	// Block category
	// ------------------------------------------------------------------

	/**
	 * Prepend the "All Feedback" category to the block inserter so that
	 * plugin blocks are grouped under their own heading.
	 *
	 * @param  array<int, array{slug: string, title: string, icon: string|null}> $categories
	 * @return array<int, array{slug: string, title: string, icon: string|null}>
	 * @since 1.0.0
	 */
	public function registerBlockCategory( array $categories ): array {
		return array_merge(
			[
				[
					'slug'  => 'all-feedback',
					'title' => __( 'All Feedback', 'all-feedback' ),
					'icon'  => null,
				],
			],
			$categories
		);
	}

	// ------------------------------------------------------------------
	// Gutenberg blocks
	// ------------------------------------------------------------------

	/**
	 * Register all plugin blocks via the BlockRegistry.
	 *
	 * To add a new block, add its class to BlockRegistry in services.php —
	 * this method never needs to change.
	 *
	 * @since 1.0.0
	 */
	public function registerBlocks(): void {
		foreach ( $this->blockRegistry->all() as $block ) {
			$block->register();
		}
	}

	// ------------------------------------------------------------------
	// Shortcodes
	// ------------------------------------------------------------------

	/**
	 * Register all plugin shortcodes.
	 */
	public function registerShortcodes(): void {
		add_shortcode( 'allfb_survey', [ $this, 'renderSurveyShortcode' ] );
	}

	/**
	 * Render the [allfb_survey id="X"] shortcode.
	 *
	 * @param  array<string, string>|string $atts Shortcode attributes.
	 * @return string                             HTML or empty string.
	 */
	public function renderSurveyShortcode( array|string $atts ): string {
		$atts     = shortcode_atts( [ 'id' => 0 ], (array) $atts, 'allfb_survey' );
		$surveyId = (int) $atts['id'];

		if ( $surveyId <= 0 ) {
			return '';
		}

		/** @var SurveyRepository $repo */
		$repo   = $this->container->get( SurveyRepository::class );
		$survey = $repo->findById( $surveyId );

		if ( $survey === null || ! $survey->getStatus()->isPublished() ) {
			return '';
		}

		$surveyId = (int) apply_filters( 'allfeedback:shortcode:survey:id', $survey->getId() );
		$nonce    = esc_attr( wp_create_nonce( SubmitController::NONCE_ACTION ) );

		return sprintf(
			'<div class="allfb-embed" data-survey-id="%d" data-nonce="%s" role="region" aria-label="%s"></div>',
			$surveyId,
			$nonce,
			esc_attr( $survey->getTitle() )
		);
	}

	// ------------------------------------------------------------------
	// Assets
	// ------------------------------------------------------------------

	/**
	 * Enqueue frontend-only scripts and styles.
	 */
	public function enqueueAssets(): void {
		/** @var array<string, mixed> $widgetSettings */
		$widgetSettings = (array) $this->settingsManager->get( 'general.widget' );
		$surveyId       = $this->targetingEngine->resolveForCurrentPage();

		if ( $surveyId === null && ! $this->pageHasEmbed() ) {
			return;
		}

		$frontendData = $this->applyFilters(
			'allfeedback:frontend:script_data',
			[
				'siteUrl'     => home_url( '/' ),
				'restUrl'     => rest_url( 'all-feedback/v1/' ),
				'nonce'       => wp_create_nonce( 'wp_rest' ),
				'submitNonce' => wp_create_nonce( SubmitController::NONCE_ACTION ),
				'version'     => \AllFeedback\Core\Constants::VERSION,
				'settings'    => array_merge( $widgetSettings, [ 'survey_id' => $surveyId ] ),
			]
		);

		$this->assetManager->enqueueScript(
			handle:   'frontend',
			src:      'frontend.js',
			localize: [
				'object_name' => '__ALLFB__',
				'data'        => $frontendData,
			]
		);

		$this->assetManager->enqueueStyle( handle: 'frontend', src: 'frontend.css' );

		$this->doAction( 'allfeedback:frontend:enqueue_assets' );
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Return true if the current post contains the [allfb_survey] shortcode
	 * or the allfeedback/survey block, so frontend assets are loaded.
	 *
	 * @since 1.0.0
	 */
	private function pageHasEmbed(): bool {
		if ( ! is_singular() ) {
			return false;
		}

		$post = get_post();

		if ( ! $post instanceof \WP_Post ) {
			return false;
		}

		return has_shortcode( $post->post_content, 'allfb_survey' )
			|| has_block( 'allfeedback/survey', $post );
	}
}
