<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Form;

defined( 'ABSPATH' ) || exit;

/**
 * Enum FormFieldType
 *
 * Exhaustive list of field types supported by the form builder.
 * Adding a new type here is the single authoritative change required —
 * the REST arg schema and validation service both derive their allowed
 * values from this enum.
 *
 * @package AllFeedback\Domain\Form
 * @since   1.0.0
 */
enum FormFieldType: string {

	case StarRating    = 'star_rating';
	case TextInput     = 'text_input';
	case Textarea      = 'textarea';
	case MultipleChoice = 'multiple_choice';
	case Checkbox      = 'checkbox';
	case Dropdown      = 'dropdown';
	case NpsScore      = 'nps_score';
	case Email         = 'email';

	// ------------------------------------------------------------------
	// Helpers
	// ------------------------------------------------------------------

	/**
	 * Return every supported type value as a plain string array.
	 * Used to populate REST API enum constraints.
	 *
	 * @return string[]
	 * @since 1.0.0
	 */
	public static function values(): array {
		return array_column( self::cases(), 'value' );
	}

	/**
	 * Whether this field type can carry a predefined list of choices
	 * (multiple_choice, checkbox, dropdown).
	 *
	 * @return bool
	 * @since 1.0.0
	 */
	public function supportsChoices(): bool {
		return in_array( $this, [ self::MultipleChoice, self::Checkbox, self::Dropdown ], true );
	}

	/**
	 * Whether this field type produces a numeric answer
	 * (star_rating, nps_score).
	 *
	 * @return bool
	 * @since 1.0.0
	 */
	public function isNumeric(): bool {
		return in_array( $this, [ self::StarRating, self::NpsScore ], true );
	}
}
