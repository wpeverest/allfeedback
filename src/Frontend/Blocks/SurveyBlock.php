<?php

declare(strict_types=1);

namespace AllFeedback\Frontend\Blocks;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\Controllers\V1\SubmitController;
use AllFeedback\Core\Container;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Survey\SurveyRepository;

/**
 * The allfeedback/survey Gutenberg block.
 *
 * Render callback: returns a lightweight mount-point div.
 * The frontend.js widget hydrates it at runtime with the interactive form.
 *
 * Editor preview: the React editor script (block-survey.js) fetches the
 * survey via apiFetch and renders a static preview using surveyPreviewHtml()
 * from resources/scripts/shared/formPreview.ts — no PHP form rendering needed.
 *
 * The accent colour is injected via wp_add_inline_script so the preview
 * matches the live widget colour without an extra REST request.
 *
 * @since 1.0.0
 */
class SurveyBlock extends AbstractBlock {

	public function __construct(
		private readonly Container $container,
		private readonly SettingsManager $settingsManager,
	) {}

	// ------------------------------------------------------------------
	// AbstractBlock contract
	// ------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 */
	protected function getSlug(): string {
		return 'survey';
	}

	/**
	 * Inject plugin settings into the block editor script after registration.
	 *
	 * window.__ALLFB_BLOCK__ is read by the React editor component to apply
	 * the correct accent colour to the form preview.
	 *
	 * @param  \WP_Block_Type $blockType
	 * @since 1.0.0
	 */
	protected function afterRegister( \WP_Block_Type $blockType ): void {
		if ( empty( $blockType->editor_script_handles ) ) {
			return;
		}

		$widgetSettings = (array) $this->settingsManager->get( 'general.widget' );

		wp_add_inline_script(
			$blockType->editor_script_handles[0],
			'window.__ALLFB_BLOCK__ = ' . wp_json_encode( [
				'color' => $widgetSettings['color'] ?? '#6366f1',
			] ) . ';',
			'before'
		);
	}

	/**
	 * Render a lightweight mount-point div for the JS widget to hydrate.
	 *
	 * Only published surveys are rendered on the frontend. The block editor
	 * canvas handles its own preview entirely in TypeScript (no PHP form HTML).
	 *
	 * @param  array<string, mixed> $attributes Block attributes.
	 * @return string                           HTML or empty string.
	 * @since 1.0.0
	 */
	public function render( array $attributes ): string {
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
}
