<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Shared;

defined( 'ABSPATH' ) || exit;

/**
 * Abstract base class for repository query filters.
 *
 * Provides pagination, full-text search, and ordering parameters shared by
 * all concrete filter classes.
 *
 * @package AllFeedback\Domain\Shared
 * @since   1.0.0
 */
abstract class QueryFilter {

	/**
	 * @param  int         $page    1-based page number.
	 * @param  int         $perPage Results per page.
	 * @param  string|null $search  Optional full-text search string.
	 * @param  string      $orderBy Column to order by. Default 'date'.
	 * @param  string      $order   Sort direction: ASC | DESC.
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly int $page = 1,
		public readonly int $perPage = 20,
		public readonly ?string $search = null,
		public readonly string $orderBy = 'date',
		public readonly string $order = 'DESC',
	) {}
}
