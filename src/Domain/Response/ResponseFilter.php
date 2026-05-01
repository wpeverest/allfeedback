<?php
/**
 * Response filter.
 *
 * @package AllFeedback\Domain\Response
 * @since   1.0.0
 */

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
	 * Constructor.
	 *
	 * @param  int|null    $survey_id Restrict results to responses for this survey ID.
	 * @param  int|null    $user_id   Restrict results to responses from this user ID.
	 * @param  string|null $date_from Lower bound for created_at (Y-m-d format).
	 * @param  string|null $date_to   Upper bound for created_at (Y-m-d format).
	 * @param  int         $page     1-based page number.
	 * @param  int         $per_page  Results per page.
	 * @param  string|null $search   Optional full-text search string (LIKE on response_data).
	 * @param  string      $order_by  Column to order by. Default 'created_at'.
	 * @param  string      $order    Sort direction: ASC | DESC.
	 * @param  bool|null   $is_read   Restrict to read (true), unread (false), or both (null).
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly ?int $survey_id = null,
		public readonly ?int $user_id = null,
		public readonly ?string $date_from = null,
		public readonly ?string $date_to = null,
		int $page = 1,
		int $per_page = 20,
		?string $search = null,
		string $order_by = 'created_at',
		string $order = 'DESC',
		public readonly ?bool $is_read = null,
	) {
		parent::__construct( $page, $per_page, $search, $order_by, $order );
	}
}
