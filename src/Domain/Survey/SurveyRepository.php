<?php

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
}
