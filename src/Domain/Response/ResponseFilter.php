<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Response;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Shared\QueryFilter;

/**
 * Query filter for the Response repository.
 *
 * Extends the base pagination / ordering parameters with Response-specific
 * constraints for survey scope, user, and submission date range.
 *
 * @package AllFeedback\Domain\Response
 * @since   1.0.0
 */
final class ResponseFilter extends QueryFilter {

	/**
	 * @param  int|null    $surveyId Restrict results to responses for this survey ID.
	 * @param  int|null    $userId   Restrict results to responses from this user ID.
	 * @param  string|null $dateFrom Lower bound for created_at (Y-m-d format).
	 * @param  string|null $dateTo   Upper bound for created_at (Y-m-d format).
	 * @param  int         $page     1-based page number.
	 * @param  int         $perPage  Results per page.
	 * @param  string|null $search   Optional full-text search string (LIKE on response_data).
	 * @param  string      $orderBy  Column to order by. Default 'created_at'.
	 * @param  string      $order    Sort direction: ASC | DESC.
	 * @param  bool|null   $isRead   Restrict to read (true), unread (false), or both (null).
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly ?int $surveyId = null,
		public readonly ?int $userId = null,
		public readonly ?string $dateFrom = null,
		public readonly ?string $dateTo = null,
		int $page = 1,
		int $perPage = 20,
		?string $search = null,
		string $orderBy = 'created_at',
		string $order = 'DESC',
		public readonly ?bool $isRead = null,
	) {
		parent::__construct( $page, $perPage, $search, $orderBy, $order );
	}
}
