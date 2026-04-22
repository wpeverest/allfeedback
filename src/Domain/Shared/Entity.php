<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Shared;

defined( 'ABSPATH' ) || exit;

/**
 * Abstract base class for all domain entities.
 *
 * Provides identity (nullable int $id) and equality comparison by type + id.
 *
 * @package AllFeedback\Domain\Shared
 * @since   1.0.0
 */
abstract class Entity {

	/**
	 * Persistence identifier, or null when the entity has not yet been saved.
	 *
	 * @var int|null
	 * @since 1.0.0
	 */
	protected ?int $id = null;

	/**
	 * Return the entity's persistence identifier, or null when the entity is new.
	 *
	 * @return int|null
	 * @since  1.0.0
	 */
	public function getId(): ?int {
		return $this->id;
	}

	/**
	 * Set the persistence identifier.
	 *
	 * @param  int $id The primary key assigned by the database.
	 * @return void
	 * @since  1.0.0
	 */
	protected function setId( int $id ): void {
		$this->id = $id;
	}

	/**
	 * Return true when the entity has not yet been persisted.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isNew(): bool {
		return null === $this->id;
	}

	/**
	 * Return true when both entities are of the same type and share the same id.
	 *
	 * @param  Entity $other The entity to compare against.
	 * @return bool
	 * @since  1.0.0
	 */
	public function equals( Entity $other ): bool {
		return get_class( $this ) === get_class( $other ) && $this->id === $other->getId();
	}
}
