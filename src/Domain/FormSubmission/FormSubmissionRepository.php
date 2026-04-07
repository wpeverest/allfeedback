<?php

declare(strict_types=1);

namespace AllFeedback\Domain\FormSubmission;

defined( 'ABSPATH' ) || exit;

/**
 * Interface FormSubmissionRepository
 *
 * Persistence port for FormSubmission aggregates.
 * Implementations are injected via the DI container and must not be
 * referenced directly from domain or application code.
 *
 * @package AllFeedback\Domain\FormSubmission
 * @since   1.0.0
 */
interface FormSubmissionRepository {

	/**
	 * Persist a new FormSubmission and return the saved instance with its generated ID.
	 *
	 * @param FormSubmission $submission The aggregate to persist.
	 * @return FormSubmission            The persisted aggregate with its assigned ID.
	 * @since 1.0.0
	 */
	public function save( FormSubmission $submission ): FormSubmission;

	/**
	 * Retrieve a single submission by its primary key.
	 * Returns null when no record exists for the given ID.
	 *
	 * @param int $id Submission primary key.
	 * @return FormSubmission|null
	 * @since 1.0.0
	 */
	public function findById( int $id ): ?FormSubmission;

	/**
	 * Retrieve a paginated list of submissions for a given form.
	 *
	 * @param int $formId  Parent form primary key.
	 * @param int $limit   Maximum records to return.
	 * @param int $offset  Number of records to skip (for pagination).
	 * @return FormSubmission[]
	 * @since 1.0.0
	 */
	public function findByFormId( int $formId, int $limit = 20, int $offset = 0 ): array;

	/**
	 * Count all submissions for a given form.
	 *
	 * @param int $formId Parent form primary key.
	 * @return int
	 * @since 1.0.0
	 */
	public function countByFormId( int $formId ): int;

	/**
	 * Permanently delete a single submission record.
	 *
	 * @param int $id Submission primary key.
	 * @return bool True on success, false when no matching record existed.
	 * @since 1.0.0
	 */
	public function delete( int $id ): bool;

	/**
	 * Permanently delete all submissions belonging to a form.
	 * Intended for use when a form itself is deleted.
	 *
	 * @param int $formId Parent form primary key.
	 * @return int        Number of rows deleted.
	 * @since 1.0.0
	 */
	public function deleteByFormId( int $formId ): int;
}
