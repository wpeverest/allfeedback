<?php

declare(strict_types=1);

namespace AllFeedback\Application\Form;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Form\FormFieldType;

/**
 * Class FormFieldDTO
 *
 * Immutable data-transfer object that carries validated and sanitised field
 * data from the REST layer into the application services.
 * Constructed via the static factory FormFieldDTO::fromArray() so that
 * controllers never need to know which keys are optional.
 *
 * @package AllFeedback\Application\Form
 * @since   1.0.0
 */
final class FormFieldDTO {

	/**
	 * @param FormFieldType $type        Field type enum value.
	 * @param string        $label       Human-visible label.
	 * @param int           $sortOrder   Display order (0-based).
	 * @param bool          $required    Whether the field must be answered.
	 * @param string        $placeholder Hint text shown inside the input.
	 * @param string[]      $choices     Pre-defined answer choices.
	 * @param array<string, mixed> $settings Field-type-specific settings.
	 */
	public function __construct(
		public readonly FormFieldType $type,
		public readonly string $label,
		public readonly int $sortOrder    = 0,
		public readonly bool $required    = false,
		public readonly string $placeholder = '',
		public readonly array $choices    = [],
		public readonly array $settings   = [],
	) {}

	/**
	 * Build a FormFieldDTO from a raw (already sanitised) request parameter array.
	 *
	 * @param array<string, mixed> $data Sanitised request data.
	 * @return static
	 * @since 1.0.0
	 */
	public static function fromArray( array $data ): static {
		return new static(
			type:        FormFieldType::from( (string) ( $data['type'] ?? '' ) ),
			label:       (string) ( $data['label'] ?? '' ),
			sortOrder:   (int) ( $data['sort_order'] ?? 0 ),
			required:    (bool) ( $data['required'] ?? false ),
			placeholder: (string) ( $data['placeholder'] ?? '' ),
			choices:     array_map( 'strval', (array) ( $data['choices'] ?? [] ) ),
			settings:    (array) ( $data['settings'] ?? [] ),
		);
	}
}
