<?php

declare(strict_types=1);

namespace AllFeedback\Application\FormSubmission;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Domain\Form\Form;
use AllFeedback\Domain\Form\FormField;
use AllFeedback\Domain\Form\FormFieldType;

/**
 * Class ValidateFormSubmissionService
 *
 * Validates that a submission's answers satisfy the constraints defined on
 * each Form field.  Collects all violations before throwing so that the
 * respondent receives the full error list in a single round-trip.
 *
 * @package AllFeedback\Application\FormSubmission
 * @since   1.0.0
 */
class ValidateFormSubmissionService {

	/**
	 * Assert that the DTO's answers are valid against the form's field definitions.
	 *
	 * @param Form                $form The form the submission is targeting.
	 * @param FormSubmissionDTO   $dto  The submission data to validate.
	 * @throws ValidationException When one or more fields fail validation.
	 * @since 1.0.0
	 */
	public function validate( Form $form, FormSubmissionDTO $dto ): void {
		if ( ! $form->isActive() ) {
			throw ValidationException::withErrors(
				[ 'form' => [ __( 'This form is not currently accepting submissions.', 'all-feedback' ) ] ]
			);
		}

		$errors = [];

		foreach ( $form->getFields() as $field ) {
			$fieldKey = (string) $field->getId();
			$answer   = $dto->answers[ $fieldKey ] ?? null;

			$fieldErrors = $this->validateField( $field, $answer );
			if ( ! empty( $fieldErrors ) ) {
				$errors[ 'field_' . $fieldKey ] = $fieldErrors;
			}
		}

		if ( ! empty( $errors ) ) {
			throw ValidationException::withErrors( $errors );
		}
	}

	// ------------------------------------------------------------------
	// Internal
	// ------------------------------------------------------------------

	/**
	 * Validate a single field's answer and return an array of error strings.
	 * An empty array means the answer is valid.
	 *
	 * @param FormField  $field  The field definition.
	 * @param mixed      $answer The respondent's raw answer.
	 * @return string[]
	 * @since 1.0.0
	 */
	private function validateField( FormField $field, mixed $answer ): array {
		$errors = [];

		if ( $field->isRequired() && $this->isEmpty( $answer ) ) {
			$errors[] = sprintf(
				/* translators: %s: Field label */
				__( '"%s" is required.', 'all-feedback' ),
				$field->getLabel()
			);
			return $errors;
		}

		if ( $this->isEmpty( $answer ) ) {
			return [];
		}

		$errors = array_merge( $errors, $this->validateByType( $field, $answer ) );

		return $errors;
	}

	/**
	 * Type-specific validation rules.
	 *
	 * @param FormField $field
	 * @param mixed     $answer Non-empty answer value.
	 * @return string[]
	 * @since 1.0.0
	 */
	private function validateByType( FormField $field, mixed $answer ): array {
		$errors = [];

		switch ( $field->getType() ) {
			case FormFieldType::StarRating:
				if ( ! is_numeric( $answer ) || (int) $answer < 1 || (int) $answer > 5 ) {
					$errors[] = sprintf(
						/* translators: %s: Field label */
						__( '"%s" must be a rating between 1 and 5.', 'all-feedback' ),
						$field->getLabel()
					);
				}
				break;

			case FormFieldType::NpsScore:
				if ( ! is_numeric( $answer ) || (int) $answer < 0 || (int) $answer > 10 ) {
					$errors[] = sprintf(
						/* translators: %s: Field label */
						__( '"%s" must be a score between 0 and 10.', 'all-feedback' ),
						$field->getLabel()
					);
				}
				break;

			case FormFieldType::Email:
				if ( ! is_string( $answer ) || ! is_email( $answer ) ) {
					$errors[] = sprintf(
						/* translators: %s: Field label */
						__( '"%s" must be a valid email address.', 'all-feedback' ),
						$field->getLabel()
					);
				}
				break;

			case FormFieldType::MultipleChoice:
			case FormFieldType::Dropdown:
				$choices = $field->getChoices();
				if ( ! empty( $choices ) && ! in_array( (string) $answer, $choices, true ) ) {
					$errors[] = sprintf(
						/* translators: %s: Field label */
						__( '"%s" contains an invalid selection.', 'all-feedback' ),
						$field->getLabel()
					);
				}
				break;

			case FormFieldType::Checkbox:
				$selected = (array) $answer;
				$choices  = $field->getChoices();
				if ( ! empty( $choices ) ) {
					foreach ( $selected as $item ) {
						if ( ! in_array( (string) $item, $choices, true ) ) {
							$errors[] = sprintf(
								/* translators: %s: Field label */
								__( '"%s" contains an invalid selection.', 'all-feedback' ),
								$field->getLabel()
							);
							break;
						}
					}
				}
				break;

			default:
				break;
		}

		return $errors;
	}

	/**
	 * Determine whether an answer value should be treated as empty.
	 *
	 * @param mixed $value
	 * @return bool
	 * @since 1.0.0
	 */
	private function isEmpty( mixed $value ): bool {
		if ( $value === null ) {
			return true;
		}
		if ( is_string( $value ) && trim( $value ) === '' ) {
			return true;
		}
		if ( is_array( $value ) && empty( $value ) ) {
			return true;
		}
		return false;
	}
}
