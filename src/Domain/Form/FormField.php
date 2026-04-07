<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Form;

defined( 'ABSPATH' ) || exit;

/**
 * Class FormField
 *
 * Represents a single field within a feedback form.
 * This is a rich domain object — it enforces its own invariants rather than
 * exposing raw setters to callers.
 *
 * @package AllFeedback\Domain\Form
 * @since   1.0.0
 */
class FormField {

	/**
	 * @param int            $id         Surrogate primary key (0 for new, unsaved fields).
	 * @param int            $formId     Parent form ID.
	 * @param FormFieldType  $type       Field type enum.
	 * @param string         $label      Human-visible label shown to respondents.
	 * @param int            $sortOrder  Display order within the form (0-based).
	 * @param bool           $required   Whether the respondent must answer this field.
	 * @param string         $placeholder Hint text shown inside the input.
	 * @param string[]       $choices    Predefined options (only meaningful for choice-type fields).
	 * @param array<string, mixed> $settings   Field-type-specific settings (min/max stars, NPS labels, etc.).
	 */
	public function __construct(
		private int $id,
		private int $formId,
		private FormFieldType $type,
		private string $label,
		private int $sortOrder   = 0,
		private bool $required   = false,
		private string $placeholder = '',
		private array $choices   = [],
		private array $settings  = [],
	) {}

	// ------------------------------------------------------------------
	// Accessors
	// ------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 */
	public function getId(): int {
		return $this->id;
	}

	/**
	 * @since 1.0.0
	 */
	public function getFormId(): int {
		return $this->formId;
	}

	/**
	 * @since 1.0.0
	 */
	public function getType(): FormFieldType {
		return $this->type;
	}

	/**
	 * @since 1.0.0
	 */
	public function getLabel(): string {
		return $this->label;
	}

	/**
	 * @since 1.0.0
	 */
	public function getSortOrder(): int {
		return $this->sortOrder;
	}

	/**
	 * @since 1.0.0
	 */
	public function isRequired(): bool {
		return $this->required;
	}

	/**
	 * @since 1.0.0
	 */
	public function getPlaceholder(): string {
		return $this->placeholder;
	}

	/**
	 * @return string[]
	 * @since 1.0.0
	 */
	public function getChoices(): array {
		return $this->choices;
	}

	/**
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function getSettings(): array {
		return $this->settings;
	}

	// ------------------------------------------------------------------
	// Mutators
	// ------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 */
	public function setLabel( string $label ): void {
		$this->label = $label;
	}

	/**
	 * @since 1.0.0
	 */
	public function setSortOrder( int $order ): void {
		$this->sortOrder = max( 0, $order );
	}

	/**
	 * @since 1.0.0
	 */
	public function setRequired( bool $required ): void {
		$this->required = $required;
	}

	/**
	 * @since 1.0.0
	 */
	public function setPlaceholder( string $placeholder ): void {
		$this->placeholder = $placeholder;
	}

	/**
	 * Replace the predefined choices for choice-type fields.
	 *
	 * @param string[] $choices
	 * @since 1.0.0
	 */
	public function setChoices( array $choices ): void {
		$this->choices = $choices;
	}

	/**
	 * Merge (or replace) field-type-specific settings.
	 *
	 * @param array<string, mixed> $settings
	 * @since 1.0.0
	 */
	public function setSettings( array $settings ): void {
		$this->settings = $settings;
	}
}
