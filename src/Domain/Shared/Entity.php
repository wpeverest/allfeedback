<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Shared;

defined( 'ABSPATH' ) || exit;

/**
 * Abstract base class for all domain entities.
 *
 * Provides identity (nullable int $id) and equality comparison by type + id.
 *
 * @since 1.0.0
 */
abstract class Entity {

	/** @since 1.0.0 */
	protected ?int $id = null;

	/**
	 * Return the entity's persistence identifier, or null when the entity is new.
	 *
	 * @since 1.0.0
	 */
	public function getId(): ?int {
		return $this->id;
	}

	/**
	 * Set the persistence identifier.
	 *
	 * @since 1.0.0
	 */
	protected function setId( int $id ): void {
		$this->id = $id;
	}

	/**
	 * Return true when the entity has not yet been persisted.
	 *
	 * @since 1.0.0
	 */
	public function isNew(): bool {
		return null === $this->id;
	}

	/**
	 * Return true when both entities are of the same type and share the same id.
	 *
	 * @since 1.0.0
	 */
	public function equals( Entity $other ): bool {
		return get_class( $this ) === get_class( $other ) && $this->id === $other->getId();
	}
}
