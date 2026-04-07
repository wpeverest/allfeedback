<?php

declare(strict_types=1);

namespace AllFeedback\Frontend;

use AllFeedback\Core\Container;
use AllFeedback\Core\ServiceProvider;
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
	) {}

	// ServiceProvider::register() — nothing extra to add here.
	public function register( ContainerBuilder $builder ): void {}

	/**
	 * Wire up WordPress hooks for the frontend context.
	 */
	public function boot(): void {
		// Register shortcodes after WP is fully loaded.
		$this->addAction( 'init', [ $this, 'registerShortcodes' ] );

		// Listen for the namespaced enqueue action fired by AppServiceProvider.
		$this->addAction( 'rmb:enqueue-assets:frontend', [ $this, 'enqueueAssets' ] );
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
		add_shortcode( 'all_feedback', [ $this, 'renderSampleShortcode' ] );

		// Add more shortcodes here as the plugin grows, e.g.:
		// add_shortcode( 'allfb_form', [ $this, 'renderFormShortcode' ] );
	}

	/**
	 * Render the [all_feedback] shortcode.
	 *
	 * Shortcode attributes are sanitised and merged with defaults before use.
	 *
	 * @param  array<string, string>|string $atts  Shortcode attributes from the editor.
	 * @param  string|null                  $content Inner content (for enclosing shortcodes).
	 * @return string                       The HTML to inject in place of the shortcode.
	 */
	public function renderSampleShortcode( array|string $atts, ?string $content = null ): string {
		// Merge user-supplied attributes with defaults.
		$atts = shortcode_atts(
			[
				'title'    => __( 'Hello from All Feedback!', 'all-feedback' ),
				'bg_color' => '#f9f9f9',
			],
			(array) $atts,
			'all_feedback'
		);

		/**
		 * Filter: rmb:shortcode:sample:atts
		 *
		 * Allows modification of the resolved shortcode attributes.
		 *
		 * @param array<string, string> $atts Resolved attributes.
		 */
		$atts = apply_filters( 'rmb:shortcode:sample:atts', $atts );

		$title   = esc_html( $atts['title'] );
		$bgColor = esc_attr( $atts['bg_color'] );

		// Mark assets for enqueue on this page load.
		// (We enqueue unconditionally in enqueueAssets(); use a flag here
		//  if you only want assets on pages that actually use the shortcode.)
		ob_start();
		?>
		<div class="allfb-sample-widget" style="background:<?php echo $bgColor; ?>;padding:20px;border-radius:6px;">
			<h3 class="allfb-sample-widget__title"><?php echo $title; ?></h3>
			<?php if ( ! empty( $content ) ) : ?>
				<div class="allfb-sample-widget__content">
					<?php echo wp_kses_post( $content ); ?>
				</div>
			<?php else : ?>
				<p><?php esc_html_e( 'Replace this shortcode renderer in FrontendServiceProvider::renderSampleShortcode().', 'all-feedback' ); ?></p>
			<?php endif; ?>

			<?php
			/**
			 * Hook: rmb:shortcode:sample:after_content
			 *
			 * Fired inside the shortcode output, after the main content.
			 */
			do_action( 'rmb:shortcode:sample:after_content', $atts );
			?>
		</div>
		<?php
		return (string) ob_get_clean();
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
		// Build the data object that will be inlined before the frontend script.
		$frontendData = $this->applyFilters(
			'rmb:frontend:script_data',
			[
				'siteUrl'  => home_url( '/' ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'restUrl'  => rest_url( 'all-feedback/v1/' ),
				'version'  => \AllFeedback\Core\Constants::VERSION,
			]
		);

		// Enqueue the main frontend JS bundle.
		// Expected at resources/build/frontend.js (output of your bundler).
		$this->assetManager->enqueueScript(
			handle:   'frontend',
			src:      'frontend.js',
			localize: [
				'object_name' => '__RMB__',
				'data'        => $frontendData,
			]
		);

		// Enqueue the frontend stylesheet.
		$this->assetManager->enqueueStyle(
			handle: 'frontend',
			src:    'frontend.css'
		);

		/**
		 * Hook: rmb:frontend:enqueue_assets
		 *
		 * Fired after the core frontend assets are enqueued.
		 * Add-ons can hook here to load their own public assets.
		 */
		$this->doAction( 'rmb:frontend:enqueue_assets' );
	}
}
