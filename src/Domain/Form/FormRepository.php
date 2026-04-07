<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Form;

defined( 'ABSPATH' ) || exit;

/**
 * Interface FormRepository
 *
 * Port (hexagonal-architecture sense) that the application layer calls to
 * persist and retrieve Form aggregates.  Infrastructure adapters (e.g., a
 * WordPress custom-table implementation) must implement this interface so
 * that domain and application logic remain storage-agnostic.
 *
 * @package AllFeedback\Domain\Form
 * @since   1.0.0
 */
interface FormRepository {

	/**
	 * Persist a new or existing Form aggregate and return the saved instance.
	 *
	 * For new forms (id === 0) the implementation is responsible for
	 * assigning a generated ID before returning.
	 *
	 * @param Form $form The aggregate to persist.
	 * @return Form      The persisted aggregate (with id populated for new records).
	 * @since 1.0.0
	 */
	public function save( Form $form ): Form;

	/**
	 * Retrieve a single Form aggregate by its primary key.
	 * Returns null when no record exists for the given ID.
	 *
	 * @param int $id Form primary key.
	 * @return Form|null
	 * @since 1.0.0
	 */
	public function findById( int $id ): ?Form;

	/**
	 * Retrieve a paginated list of Form aggregates.
	 *
	 * @param int         $limit    Maximum number of records to return.
	 * @param int         $offset   Number of records to skip (for pagination).
	 * @param string|null $search   Optional full-text search term to filter by title.
	 * @param bool|null   $isActive When non-null, restrict results to active/inactive forms.
	 * @return Form[]
	 * @since 1.0.0
	 */
	public function findAll( int $limit = 20, int $offset = 0, ?string $search = null, ?bool $isActive = null ): array;

	/**
	 * Count all forms matching the optional filters.
	 *
	 * @param string|null $search   Optional title search term.
	 * @param bool|null   $isActive When non-null, restrict count to active/inactive forms.
	 * @return int
	 * @since 1.0.0
	 */
	public function count( ?string $search = null, ?bool $isActive = null ): int;

	/**
	 * Permanently delete a form and all its associated fields.
	 * Returns true on success, false when no record with the given ID existed.
	 *
	 * @param int $id Form primary key.
	 * @return bool
	 * @since 1.0.0
	 */
	public function delete( int $id ): bool;
}
