<?php

declare(strict_types=1);

namespace AllFeedback\Frontend;

use AllFeedback\API\Controllers\V1\SubmitController;
use AllFeedback\Core\Container;
use AllFeedback\Core\ServiceProvider;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Support\AssetManager;
use AllFeedback\Traits\Hooks;
use DI\ContainerBuilder;

/**
 * Class FrontendServiceProvider
 *
 * Boots all public-facing functionality:
 *  - Shortcode registration
 *  - Frontend script / style enqueueing
 *
 * How to add a new shortcode:
 *  1. Register it in registerShortcodes() with add_shortcode().
 *  2. Create a render method (or delegate to a dedicated Controller).
 *  3. Enqueue assets in enqueueAssets() guarded by is_page() or a flag.
 */
class FrontendServiceProvider implements ServiceProvider {

	use Hooks;

	public function __construct(
		private readonly Container $container,
		private readonly AssetManager $assetManager,
		private readonly SettingsManager $settingsManager,
		private readonly TargetingEngine $targetingEngine,
	) {}

	// ServiceProvider::register() — nothing extra to add here.
	public function register( ContainerBuilder $builder ): void {}

	/**
	 * Wire up WordPress hooks for the frontend context.
	 */
	public function boot(): void {
		// Register shortcodes and Gutenberg block after WP is fully loaded.
		$this->addAction( 'init', [ $this, 'registerShortcodes' ] );
		$this->addAction( 'init', [ $this, 'registerBlock' ] );

		// Listen for the namespaced enqueue action fired by AppServiceProvider.
		$this->addAction( 'allfeedback:enqueue-assets:frontend', [ $this, 'enqueueAssets' ] );
	}

	// ------------------------------------------------------------------
	// Shortcodes
	// ------------------------------------------------------------------

	/**
	 * Register all plugin shortcodes.
	 *
	 * Usage on a page/post:  [all_feedback]
	 */
	public function registerShortcodes(): void {
		add_shortcode( 'allfb_survey', [ $this, 'renderSurveyShortcode' ] );
	}

	/**
	 * Render the [allfb_survey id="X"] shortcode.
	 *
	 * Outputs a mount point div; the frontend JS bundle fetches and renders
	 * the survey form inside it, keeping the PHP layer free of HTML concerns.
	 *
	 * @param  array<string, string>|string $atts Shortcode attributes.
	 * @return string                       HTML mount point, or empty string on error.
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

		/**
		 * Filter: allfeedback:shortcode:survey:id
		 *
		 * Allows advanced use-cases to swap the rendered survey ID at runtime.
		 *
		 * @param int $surveyId Resolved survey ID.
		 */
		$surveyId = (int) apply_filters( 'allfeedback:shortcode:survey:id', $survey->getId() );

		$nonce = esc_attr( wp_create_nonce( SubmitController::NONCE_ACTION ) );

		return sprintf(
			'<div class="allfb-embed" data-survey-id="%d" data-nonce="%s" role="region" aria-label="%s"></div>',
			$surveyId,
			$nonce,
			esc_attr( $survey->getTitle() )
		);
	}

	// ------------------------------------------------------------------
	// Gutenberg block
	// ------------------------------------------------------------------

	/**
	 * Register the allfeedback/survey Gutenberg block.
	 *
	 * The block.json declares the editor script and frontend style.
	 * We supply a render_callback so WordPress uses server-side rendering
	 * (the block save() returns null in JS).
	 *
	 * @since 1.0.0
	 */
	public function registerBlock(): void {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}

		register_block_type(
			\AllFeedback\Core\Constants::path( 'blocks/allfb-survey' ),
			[
				'render_callback' => [ $this, 'renderSurveyBlock' ],
			]
		);
	}

	/**
	 * Server-side render callback for the allfeedback/survey block.
	 *
	 * Outputs the same mount-point div as the shortcode; the shared
	 * frontend.js bundle picks it up and renders the survey form.
	 *
	 * @param  array<string, mixed> $attributes Block attributes.
	 * @return string                           HTML output or empty string.
	 * @since 1.0.0
	 */
	public function renderSurveyBlock( array $attributes ): string {
		$surveyId = (int) ( $attributes['surveyId'] ?? 0 );

		if ( $surveyId <= 0 ) {
			return '';
		}

		/** @var SurveyRepository $repo */
		$repo   = $this->container->get( SurveyRepository::class );
		$survey = $repo->findById( $surveyId );

		if ( $survey === null || ! $survey->getStatus()->isPublished() ) {
			return '';
		}

		$nonce = esc_attr( wp_create_nonce( SubmitController::NONCE_ACTION ) );

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
	 *
	 * For a shortcode-only plugin you might guard with is_page() or a
	 * has_shortcode() check to avoid loading assets on every page.
	 */
	public function enqueueAssets(): void {
		/** @var array<string, mixed> $widgetSettings */
		$widgetSettings = (array) $this->settingsManager->get( 'general.widget' );

		// Determine which survey (if any) targets the current page for the floating widget.
		$surveyId = $this->targetingEngine->resolveForCurrentPage();

		// Performance gate: skip asset enqueue if no survey targets this page AND
		// no [allfb_survey] shortcode is present in the page content.
		// We always enqueue when a targeted survey exists; for shortcodes the
		// enqueue is triggered by WP's built-in has_shortcode detection.
		if ( $surveyId === null && ! $this->pageHasEmbed() ) {
			return;
		}

		// Build the data object that will be inlined before the frontend script.
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

		// Enqueue the main frontend JS bundle.
		// Expected at resources/build/frontend.js (output of your bundler).
		$this->assetManager->enqueueScript(
			handle:   'frontend',
			src:      'frontend.js',
			localize: [
				'object_name' => '__ALLFB__',
				'data'        => $frontendData,
			]
		);

		// Enqueue the frontend stylesheet.
		$this->assetManager->enqueueStyle(
			handle: 'frontend',
			src:    'frontend.css'
		);

		/**
		 * Hook: allfeedback:frontend:enqueue_assets
		 *
		 * Fired after the core frontend assets are enqueued.
		 * Add-ons can hook here to load their own public assets.
		 */
		$this->doAction( 'allfeedback:frontend:enqueue_assets' );
	}

	// ------------------------------------------------------------------
	// Internal helpers
	// ------------------------------------------------------------------

	/**
	 * Return true if the current singular post/page contains the
	 * [allfb_survey] shortcode or the allfeedback/survey block,
	 * so we know to load frontend assets even when the TargetingEngine
	 * returned no floating-widget survey.
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
