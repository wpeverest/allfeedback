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
	 *
	 */
	public function enqueueAssets(): void {
		/** @var array<string, mixed> $widgetSettings */
		$widgetSettings = (array) $this->settingsManager->get( 'general.widget' );
		$surveyId       = $this->targetingEngine->resolveForCurrentPage();

		if ( $surveyId === null && ! $this->pageHasEmbed() ) {
			return;
		}

		// When a specific survey is targeted for the floating widget, merge its
		// display settings on top of the global defaults.  Only non-null form
		// values override — if a field isn't set on the form, the global default wins.
		if ( $surveyId !== null ) {
			/** @var SurveyRepository $repo */
			$repo   = $this->container->get( SurveyRepository::class );
			$survey = $repo->findById( $surveyId );

			if ( $survey !== null ) {
				$widgetSettings = $this->mergeFormDisplaySettings(
					$widgetSettings,
					$survey->getSettings()
				);
			}
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
	 * Merge per-form display settings into the global widget settings array.
	 *
	 * Only fields that are explicitly set on the form (non-null) override the
	 * global value.  This preserves the global default for any field the author
	 * left unconfigured on the form.
	 *
	 * DB key (survey.settings JSON) → __ALLFB__.settings key:
	 *   trigger_type + delay_value + delay_unit → trigger, delay (seconds)
	 *   scroll_depth                            → scroll_threshold (0–100)
	 *   user_state                              → show_to ('all'|'logged_in'|'logged_out')
	 *   display_frequency                       → display_frequency ('once'|'until_submit')
	 *   max_impressions                         → max_impressions
	 *   dismiss_wait_value + dismiss_wait_unit  → reshow_after_days
	 *
	 * @param  array<string, mixed> $global Global widget settings.
	 * @param  array<string, mixed> $form   Survey::getSettings() decoded array (DB snake_case keys).
	 * @return array<string, mixed>         Merged settings.
	 * @since 1.0.0
	 */
	private function mergeFormDisplaySettings( array $global, array $form ): array {
		// ── Trigger type → global trigger key ────────────────────────────────
		$triggerTypeMap = [
			'immediate'    => 'auto',
			'time_delay'   => 'auto',
			'scroll_depth' => 'scroll',
		];
		$trigger = isset( $form['trigger_type'] )
			? ( $triggerTypeMap[ $form['trigger_type'] ] ?? null )
			: null;

		// ── Delay in seconds from delay_value + delay_unit ────────────────────
		$delay = null;
		if ( isset( $form['delay_value'], $form['delay_unit'] ) ) {
			$unitMultiplier = [ 'seconds' => 1, 'minutes' => 60, 'hours' => 3600 ];
			$delay = (int) round( (float) $form['delay_value'] * ( $unitMultiplier[ $form['delay_unit'] ] ?? 1 ) );
		}

		// ── Reshow cooldown in days from dismiss_wait_value + dismiss_wait_unit ─
		$reshowAfterDays = null;
		if ( isset( $form['dismiss_wait_value'], $form['dismiss_wait_unit'] ) ) {
			$dayMultiplier = [ 'hours' => 1 / 24, 'days' => 1, 'weeks' => 7 ];
			$reshowAfterDays = (int) ceil( (float) $form['dismiss_wait_value'] * ( $dayMultiplier[ $form['dismiss_wait_unit'] ] ?? 1 ) );
		}

		$overrides = [
			// Widget display trigger
			'trigger'           => $trigger,
			'delay'             => $delay,
			'scroll_threshold'  => isset( $form['scroll_depth'] ) ? (int) $form['scroll_depth']          : null,

			// Audience
			'show_to'           => isset( $form['user_state'] )   ? (string) $form['user_state']          : null,

			// Frequency & limits
			'display_frequency' => isset( $form['display_frequency'] ) ? (string) $form['display_frequency'] : null,
			'max_impressions'   => isset( $form['max_impressions'] )   ? (int) $form['max_impressions']      : null,
			'reshow_after_days' => $reshowAfterDays,
		];

		// Only apply overrides that are actually set on the form (filter nulls).
		return array_merge( $global, array_filter( $overrides, fn( $v ) => $v !== null ) );
	}

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
