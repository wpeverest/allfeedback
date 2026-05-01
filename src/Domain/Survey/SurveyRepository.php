<?php
/**
 * Survey repository.
 *
 * @package AllFeedback\Domain\Survey
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Domain\Survey;

defined( 'ABSPATH' ) || exit;

/**
 * Repository interface for the Survey aggregate.
 *
 * Implementations are registered in the DI container and provide the actual
 * persistence mechanism (e.g. wpdb).
 *
 * @package AllFeedback\Domain\Survey
 * @since   1.0.0
 */
interface SurveyRepository {

	/**
	 * Persist a new or updated Survey and return the saved instance.
	 *
	 * @param  Survey $survey The aggregate to persist.
	 * @return Survey The saved instance with its persistence ID assigned.
	 * @since  1.0.0
	 */
	public function save( Survey $survey ): Survey;

	/**
	 * Retrieve a single Survey by its primary key, or null if not found.
	 *
	 * @param  int $id Survey primary key.
	 * @return Survey|null
	 * @since  1.0.0
	 */
	public function findById( int $id ): ?Survey;

	/**
	 * Retrieve all Surveys matching the given filter.
	 *
	 * @param  SurveyFilter $filter Query constraints and pagination.
	 * @return Survey[]
	 * @since  1.0.0
	 */
	public function findAll( SurveyFilter $filter ): array;

	/**
	 * Count all Surveys matching the given filter.
	 *
	 * @param  SurveyFilter $filter Query constraints.
	 * @return int
	 * @since  1.0.0
	 */
	public function count( SurveyFilter $filter ): int;

	/**
	 * Permanently remove a Survey by its primary key.
	 *
	 * @param  int $id Survey primary key.
	 * @return bool True on success.
	 * @since  1.0.0
	 */
	public function delete( int $id ): bool;

	/**
	 * Atomically increment the denormalised response counter by one.
	 *
	 * @param  int $id Survey primary key.
	 * @return void
	 * @since  1.0.0
	 */
	public function incrementResponseCount( int $id ): void;

	/**
	 * Atomically decrement the denormalised response counter (never below zero).
	 *
	 * @param  int $id Survey primary key.
	 * @return void
	 * @since  1.0.0
	 */
	public function decrementResponseCount( int $id ): void;

	/**
	 * Retrieve multiple surveys by their primary keys in a single query.
	 *
	 * Returns an array keyed by survey ID so callers can do O(1) lookups.
	 * IDs that do not exist in the database are silently omitted.
	 *
	 * @param  int[] $ids Survey primary keys.
	 * @return array<int, Survey>
	 * @since  1.0.0
	 */
	public function findByIds( array $ids ): array;

	/**
	 * Count published surveys and how many were created within the last 7 days, in one query.
	 *
	 * Returns: total (all published), new_this_week (published AND created in last 7 days).
	 *
	 * @return array{total: int, new_this_week: int}
	 * @since  1.0.0
	 */
	public function countPublishedWithNewCount(): array;
}
