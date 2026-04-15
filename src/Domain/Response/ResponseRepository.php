<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Response;

defined( 'ABSPATH' ) || exit;

/**
 * Repository interface for the Response aggregate.
 *
 * Implementations are registered in the DI container and provide the actual
 * persistence mechanism (e.g. wpdb).
 *
 * @since 1.0.0
 */
interface ResponseRepository {

	/**
	 * Persist a new Response and return the saved instance.
	 *
	 * @since 1.0.0
	 */
	public function save( Response $response ): Response;

	/**
	 * Retrieve a single Response by its primary key, or null if not found.
	 *
	 * @since 1.0.0
	 */
	public function findById( int $id ): ?Response;

	/**
	 * Retrieve all Responses for a given Survey, applying the filter.
	 *
	 * @return Response[]
	 *
	 * @since 1.0.0
	 */
	public function findBySurveyId( int $surveyId, ResponseFilter $filter ): array;

	/**
	 * Count all Responses for a given Survey, applying the filter.
	 *
	 * @since 1.0.0
	 */
	public function countBySurveyId( int $surveyId, ResponseFilter $filter ): int;

	/**
	 * Retrieve all Responses across every survey, applying the filter.
	 *
	 * @return Response[]
	 * @since 1.0.0
	 */
	public function findAll( ResponseFilter $filter ): array;

	/**
	 * Count all Responses across every survey, applying the filter.
	 *
	 * @since 1.0.0
	 */
	public function countAll( ResponseFilter $filter ): int;

	/**
	 * Update specific columns of a Response row by its primary key.
	 *
	 * Only the keys present in $data are written; all values must already be
	 * safe for direct DB insertion (the implementation handles escaping).
	 *
	 * Accepted keys: response_data (JSON string), is_read (0|1).
	 *
	 * @param  int                  $id   Response primary key.
	 * @param  array<string, mixed> $data Column → value pairs to update.
	 * @since 1.0.0
	 */
	public function update( int $id, array $data ): bool;

	/**
	 * Permanently remove a single Response by its primary key.
	 *
	 * @since 1.0.0
	 */
	public function delete( int $id ): bool;

	/**
	 * Permanently remove all Responses belonging to a given Survey.
	 *
	 * @since 1.0.0
	 */
	public function deleteBySurveyId( int $surveyId ): bool;

	/**
	 * Count all unread Responses across every non-trashed Survey.
	 *
	 * Used to render the unread badge in the WordPress admin sidebar.
	 *
	 * @since 1.0.0
	 */
	public function countUnread(): int;

	/**
	 * Return true if a response from the given IP hash already exists for
	 * the survey within the look-back window.
	 *
	 * @param int    $surveyId    Survey to check against.
	 * @param string $ipHash      HMAC hash of the visitor IP.
	 * @param int    $windowHours How far back to look (0 = all-time).
	 * @since 1.0.0
	 */
	public function existsByIpHash( int $surveyId, string $ipHash, int $windowHours = 0 ): bool;
}
