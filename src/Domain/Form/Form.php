<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Form;

defined( 'ABSPATH' ) || exit;

/**
 * Class Form
 *
 * Aggregate root for the Form domain.
 * Owns its ordered collection of FormField objects and enforces
 * business rules such as field-order uniqueness and activation state.
 *
 * @package AllFeedback\Domain\Form
 * @since   1.0.0
 */
class Form {

	/**
	 * @param int            $id          Surrogate primary key (0 for new, unsaved forms).
	 * @param string         $title       Form title shown in the builder and on embedded forms.
	 * @param string         $description Optional description/intro text.
	 * @param bool           $isActive    Whether the form accepts new submissions.
	 * @param FormField[]    $fields      Ordered field collection.
	 * @param \DateTimeImmutable      $createdAt   Creation timestamp.
	 * @param \DateTimeImmutable|null $updatedAt   Last-updated timestamp (null until first update).
	 */
	public function __construct(
		private int $id,
		private string $title,
		private string $description  = '',
		private bool $isActive       = true,
		private array $fields        = [],
		private \DateTimeImmutable $createdAt = new \DateTimeImmutable(),
		private ?\DateTimeImmutable $updatedAt = null,
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
	public function getTitle(): string {
		return $this->title;
	}

	/**
	 * @since 1.0.0
	 */
	public function getDescription(): string {
		return $this->description;
	}

	/**
	 * @since 1.0.0
	 */
	public function isActive(): bool {
		return $this->isActive;
	}

	/**
	 * Return fields sorted ascending by their sort_order.
	 *
	 * @return FormField[]
	 * @since 1.0.0
	 */
	public function getFields(): array {
		$fields = $this->fields;
		usort( $fields, fn( FormField $a, FormField $b ) => $a->getSortOrder() <=> $b->getSortOrder() );
		return $fields;
	}

	/**
	 * @since 1.0.0
	 */
	public function getCreatedAt(): \DateTimeImmutable {
		return $this->createdAt;
	}

	/**
	 * @since 1.0.0
	 */
	public function getUpdatedAt(): ?\DateTimeImmutable {
		return $this->updatedAt;
	}

	// ------------------------------------------------------------------
	// Mutators
	// ------------------------------------------------------------------

	/**
	 * @since 1.0.0
	 */
	public function setTitle( string $title ): void {
		$this->title = $title;
	}

	/**
	 * @since 1.0.0
	 */
	public function setDescription( string $description ): void {
		$this->description = $description;
	}

	/**
	 * Mark the form as accepting new submissions.
	 *
	 * @since 1.0.0
	 */
	public function activate(): void {
		$this->isActive  = true;
		$this->updatedAt = new \DateTimeImmutable();
	}

	/**
	 * Mark the form as closed — no new submissions will be accepted.
	 *
	 * @since 1.0.0
	 */
	public function deactivate(): void {
		$this->isActive  = false;
		$this->updatedAt = new \DateTimeImmutable();
	}

	/**
	 * Replace the entire field collection.
	 * The caller is responsible for ensuring correct sort_order values.
	 *
	 * @param FormField[] $fields
	 * @since 1.0.0
	 */
	public function setFields( array $fields ): void {
		$this->fields    = $fields;
		$this->updatedAt = new \DateTimeImmutable();
	}

	/**
	 * Append a single field to the collection.
	 *
	 * @since 1.0.0
	 */
	public function addField( FormField $field ): void {
		$this->fields[]  = $field;
		$this->updatedAt = new \DateTimeImmutable();
	}

	/**
	 * Touch the updated-at timestamp without changing any other state.
	 *
	 * @since 1.0.0
	 */
	public function touch(): void {
		$this->updatedAt = new \DateTimeImmutable();
	}
}
