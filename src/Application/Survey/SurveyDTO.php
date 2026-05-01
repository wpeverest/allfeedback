<?php
/**
 * Surveydto.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Application\Survey;

defined( 'ABSPATH' ) || exit;

/**
 * Immutable data-transfer object representing a survey payload.
 *
 * @package AllFeedback\Application\Survey
 * @since   1.0.0
 */
class SurveyDTO {

	/**
	 * Constructor.
	 *
	 * @param  string       $title       Survey title.
	 * @param  string       $description Survey description.
	 * @param  array<mixed> $form_schema  Structured form field definitions.
	 * @param  array<mixed> $settings    Display and behaviour settings.
	 * @param  array<mixed> $targeting   Targeting rules.
	 * @param  string       $status      Lifecycle status string.
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly string $title,
		public readonly string $description,
		public readonly array $form_schema,
		public readonly array $settings,
		public readonly array $targeting,
		public readonly string $status,
	) {}

	/**
	 * Build a SurveyDTO from a raw associative array.
	 *
	 * @param  array<mixed> $data Raw request data.
	 * @return self
	 * @since  1.0.0
	 */
	public static function fromArray( array $data ): self {
		return new self(
			title: $data['title'] ?? '',
			description: $data['description'] ?? '',
			form_schema: $data['form_schema'] ?? [],
			settings: $data['settings'] ?? [],
			targeting: $data['targeting'] ?? [],
			status: $data['status'] ?? 'draft',
		);
	}
}
