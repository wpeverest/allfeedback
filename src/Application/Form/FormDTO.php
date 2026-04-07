<?php

declare(strict_types=1);

namespace AllFeedback\Application\Form;

defined( 'ABSPATH' ) || exit;

/**
 * Class FormDTO
 *
 * Immutable data-transfer object for form create and update operations.
 * Carries only the attributes that callers are permitted to write; read-only
 * properties (ID, timestamps) are never included here.
 *
 * @package AllFeedback\Application\Form
 * @since   1.0.0
 */
final class FormDTO {

	/**
	 * @param string          $title       Form title.
	 * @param string          $description Optional description / intro text.
	 * @param bool            $isActive    Whether the form accepts new submissions.
	 * @param FormFieldDTO[]  $fields      Ordered field DTOs to persist with the form.
	 */
	public function __construct(
		public readonly string $title,
		public readonly string $description = '',
		public readonly bool $isActive      = true,
		public readonly array $fields       = [],
	) {}

	/**
	 * Build a FormDTO from a raw (already sanitised) request parameter array.
	 *
	 * Fields are constructed via FormFieldDTO::fromArray() for each entry
	 * found under the 'fields' key.
	 *
	 * @param array<string, mixed> $data Sanitised request data.
	 * @return static
	 * @since 1.0.0
	 */
	public static function fromArray( array $data ): static {
		$fieldDTOs = [];
		foreach ( (array) ( $data['fields'] ?? [] ) as $rawField ) {
			if ( is_array( $rawField ) ) {
				$fieldDTOs[] = FormFieldDTO::fromArray( $rawField );
			}
		}

		return new static(
			title:       (string) ( $data['title'] ?? '' ),
			description: (string) ( $data['description'] ?? '' ),
			isActive:    (bool) ( $data['is_active'] ?? true ),
			fields:      $fieldDTOs,
		);
	}
}
