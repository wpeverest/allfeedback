<?php

declare(strict_types=1);

namespace AllFeedback\Frontend;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\Controllers\V1\SubmitController;
use AllFeedback\Application\Survey\SurveyStateService;
use AllFeedback\Core\Container;
use AllFeedback\Core\ServiceProvider;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Frontend\Blocks\BlockRegistry;
use AllFeedback\Support\AssetManager;
use AllFeedback\Traits\Hooks;
use DI\ContainerBuilder;

/**
 * Boots all public-facing functionality for the All Feedback plugin.
 *
 * Responsibilities:
 *  - Shortcode registration.
 *  - Gutenberg block registration (delegated to `BlockRegistry`).
 *  - Frontend script/style enqueueing.
 *
 * Adding a new Gutenberg block: add its class to `BlockRegistry` in
 * `config/services.php` — this class never needs to change.
 *
 * Adding a new shortcode: register it in `registerShortcodes()` and create a
 * render method (or delegate to a dedicated class).
 *
 * @package AllFeedback\Frontend
 * @since   1.0.0
 */
class FrontendServiceProvider implements ServiceProvider {

	use Hooks;

	/**
	 * @param  Container          $container       DI container.
	 * @param  AssetManager       $assetManager    Asset enqueueing helper.
	 * @param  SettingsManager    $settingsManager Plugin settings.
	 * @param  TargetingEngine    $targetingEngine Determines which surveys appear on the current page.
	 * @param  BlockRegistry      $blockRegistry   Registry of all Gutenberg blocks.
	 * @param  SurveyStateService $stateService    Survey display-state resolver.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Container $container,
		private readonly AssetManager $assetManager,
		private readonly SettingsManager $settingsManager,
		private readonly TargetingEngine $targetingEngine,
		private readonly BlockRegistry $blockRegistry,
		private readonly SurveyStateService $stateService,
	) {}

	/**
	 * {@inheritDoc}
	 *
	 * @param  ContainerBuilder $builder PHP-DI builder instance.
	 * @return void
	 * @since  1.0.0
	 */
	public function register( ContainerBuilder $builder ): void {}

	/**
	 * Wire up WordPress hooks for the frontend context.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function boot(): void {
		$this->addAction( 'init',                 [ $this, 'registerShortcodes' ] );
		$this->addAction( 'init',                 [ $this, 'registerBlocks'     ] );
		$this->addFilter( 'block_categories_all', [ $this, 'registerBlockCategory' ], 10, 1 );
		$this->addAction( 'allfeedback:enqueue-assets:frontend', [ $this, 'enqueueAssets' ] );
	}

	/**
	 * Prepend the "All Feedback" category to the block inserter so that
	 * plugin blocks are grouped under their own heading.
	 *
	 * @param  array<int, array{slug: string, title: string, icon: string|null}> $categories Existing block categories.
	 * @return array<int, array{slug: string, title: string, icon: string|null}>
	 * @since  1.0.0
	 */
	public function registerBlockCategory( array $categories ): array {
		return array_merge(
			[
				[
					'slug'  => 'allfeedback',
					'title' => __( 'All Feedback', 'allfeedback' ),
					'icon'  => null,
				],
			],
			$categories
		);
	}

	/**
	 * Register all plugin blocks via the `BlockRegistry`.
	 *
	 * To add a new block, add its class to `BlockRegistry` in `config/services.php`.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerBlocks(): void {
		foreach ( $this->blockRegistry->all() as $block ) {
			$block->register();
		}
	}

	/**
	 * Register all plugin shortcodes.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function registerShortcodes(): void {
		add_shortcode( 'allfb_survey', [ $this, 'renderSurveyShortcode' ] );
	}

	/**
	 * Render the `[allfb_survey id="X"]` shortcode.
	 *
	 * @param  array<string, string>|string $atts Shortcode attributes.
	 * @return string                             HTML output or empty string.
	 * @since  1.0.0
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

	/**
	 * Enqueue frontend-only scripts and styles.
	 *
	 * Resolves which surveys are targeted for the current page, builds per-survey
	 * configuration objects, and passes everything to the frontend JS orchestrator
	 * via localised script data.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function enqueueAssets(): void {
		/** @var array<string, mixed> $globalWidgetSettings */
		$globalWidgetSettings = (array) $this->settingsManager->get( 'general.widget' );
		$surveyIds            = $this->targetingEngine->resolveAllForCurrentPage();

		if ( empty( $surveyIds ) && ! $this->pageHasEmbed() ) {
			return;
		}

		/** @var array<int, array<string, mixed>> $surveyConfigs */
		$surveyConfigs = [];

		if ( ! empty( $surveyIds ) ) {
			/** @var SurveyRepository $repo */
			$repo        = $this->container->get( SurveyRepository::class );
			$isLoggedIn  = is_user_logged_in();
			$currentUser = $isLoggedIn ? get_current_user_id() : 0;

			foreach ( $surveyIds as $id ) {
				$survey = $repo->findById( $id );
				if ( $survey === null ) {
					continue;
				}

				$merged = $this->mergeFormDisplaySettings( $globalWidgetSettings, $survey->getSettings(), $survey->getStyling() );

				$config = [
					'id'          => $id,
					'is_logged_in' => $isLoggedIn,
				];

				if ( isset( $merged['show_to'] ) )           $config['show_to']           = (string) $merged['show_to'];
				if ( isset( $merged['display_frequency'] ) ) $config['display_frequency'] = (string) $merged['display_frequency'];
				if ( isset( $merged['max_impressions'] ) )   $config['max_impressions']   = (int) $merged['max_impressions'];
				if ( isset( $merged['reshow_after_days'] ) ) $config['reshow_after_days'] = (int) $merged['reshow_after_days'];
				if ( isset( $merged['widget_position'] ) )   $config['widget_position']   = (string) $merged['widget_position'];
				if ( isset( $merged['widget_icon'] ) )       $config['widget_icon']       = (string) $merged['widget_icon'];
				if ( isset( $merged['widget_label'] ) )      $config['widget_label']      = (string) $merged['widget_label'];
				if ( isset( $merged['widget_color'] ) )      $config['widget_color']      = (string) $merged['widget_color'];
				if ( isset( $merged['trigger_icon'] ) )      $config['trigger_icon']      = (string) $merged['trigger_icon'];

				if ( $isLoggedIn ) {
					$config['server_state'] = $this->stateService->getState( $currentUser, $id );
				}

				$surveyConfigs[] = $config;
			}
		}

		$widgetSettings = $globalWidgetSettings;
		if ( ! empty( $surveyIds ) ) {
			/** @var SurveyRepository $repo */
			$repo   = $this->container->get( SurveyRepository::class );
			$survey = $repo->findById( $surveyIds[0] );
			if ( $survey !== null ) {
				$widgetSettings = $this->mergeFormDisplaySettings( $globalWidgetSettings, $survey->getSettings() );
			}
		}

		$primarySurveyId = $surveyIds[0] ?? null;

		$frontendData = $this->applyFilters(
			'allfeedback:frontend:script_data',
			[
				'siteUrl'     => home_url( '/' ),
				'restUrl'     => rest_url( 'all-feedback/v1/' ),
				'nonce'       => wp_create_nonce( 'wp_rest' ),
				'submitNonce' => wp_create_nonce( SubmitController::NONCE_ACTION ),
				'version'     => \AllFeedback\Core\Constants::VERSION,
				'settings'    => array_merge(
					$widgetSettings,
					[
						'survey_id'      => $primarySurveyId,
						'survey_configs' => $surveyConfigs,
					]
				),
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

	/**
	 * Merge per-form display settings into the global widget settings array.
	 *
	 * Only fields that are explicitly set on the form (non-null) override the
	 * global value. This preserves the global default for any field the author
	 * left unconfigured on the form.
	 *
	 * DB key (survey.settings JSON) → `__ALLFB__.settings` key:
	 *   `trigger_type` + `delay_value` + `delay_unit` → `trigger`, `delay` (seconds)
	 *   `scroll_depth`                                 → `scroll_threshold` (0–100)
	 *   `user_state`                                   → `show_to` (`'all'|'logged_in'|'logged_out'`)
	 *   `display_frequency`                            → `display_frequency` (`'once'|'until_submit'`)
	 *   `max_impressions`                              → `max_impressions`
	 *   `dismiss_wait_value` + `dismiss_wait_unit`     → `reshow_after_days`
	 *
	 * @param  array<string, mixed> $global  Global widget settings.
	 * @param  array<string, mixed> $form    `Survey::getSettings()` decoded array (DB snake_case keys).
	 * @param  array<string, mixed> $styling Optional per-survey styling column values.
	 * @return array<string, mixed>          Merged settings.
	 * @since  1.0.0
	 */
	private function mergeFormDisplaySettings( array $global, array $form, array $styling = [] ): array {
		$triggerTypeMap = [
			'immediate'    => 'auto',
			'time_delay'   => 'auto',
			'scroll_depth' => 'scroll',
		];
		$trigger = isset( $form['trigger_type'] )
			? ( $triggerTypeMap[ $form['trigger_type'] ] ?? null )
			: null;

		$delay = null;
		if ( isset( $form['trigger_type'] ) && $form['trigger_type'] === 'immediate' ) {
			$delay = 0;
		} elseif ( isset( $form['delay_value'], $form['delay_unit'] ) ) {
			$unitMultiplier = [ 'seconds' => 1, 'minutes' => 60, 'hours' => 3600 ];
			$delay = (int) round( (float) $form['delay_value'] * ( $unitMultiplier[ $form['delay_unit'] ] ?? 1 ) );
		}

		$reshowAfterDays = null;
		if ( isset( $form['dismiss_wait_value'], $form['dismiss_wait_unit'] ) ) {
			$dayMultiplier   = [ 'hours' => 1 / 24, 'days' => 1, 'weeks' => 7 ];
			$reshowAfterDays = (int) ceil( (float) $form['dismiss_wait_value'] * ( $dayMultiplier[ $form['dismiss_wait_unit'] ] ?? 1 ) );
		}

		$overrides = [
			'trigger'           => $trigger,
			'delay'             => $delay,
			'scroll_threshold'  => isset( $form['scroll_depth'] )      ? (int) $form['scroll_depth']              : null,
			'show_to'           => isset( $form['user_state'] )         ? (string) $form['user_state']             : null,
			'display_frequency' => isset( $form['display_frequency'] )  ? (string) $form['display_frequency']      : null,
			'max_impressions'   => isset( $form['max_impressions'] )    ? (int) $form['max_impressions']            : null,
			'reshow_after_days' => $reshowAfterDays,
			'widget_position'   => ( isset( $styling['widget_position'] ) && $styling['widget_position'] !== '' ) ? (string) $styling['widget_position'] : null,
			'widget_icon'       => ( isset( $styling['widget_icon'] )     && $styling['widget_icon']     !== '' ) ? (string) $styling['widget_icon']     : null,
			'widget_label'      => ( isset( $styling['widget_label'] )    && $styling['widget_label']    !== '' ) ? (string) $styling['widget_label']    : null,
			'widget_color'      => ( isset( $styling['widget_color'] )    && $styling['widget_color']    !== '' ) ? (string) $styling['widget_color']    : null,
			'trigger_icon'      => isset( $form['triggerIcon'] )         ? (string) $form['triggerIcon']           : null,
		];

		return array_merge( $global, array_filter( $overrides, fn( $v ) => $v !== null ) );
	}

	/**
	 * Return true if the current post contains the `[allfb_survey]` shortcode
	 * or the `allfeedback/survey` block, so frontend assets are loaded.
	 *
	 * @return bool
	 * @since  1.0.0
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
