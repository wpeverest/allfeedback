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
 * @since 1.0.0
 */
final class ResponseFilter extends QueryFilter {

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		public readonly ?int $surveyId = null,
		public readonly ?int $userId = null,
		public readonly ?string $dateFrom = null,
		public readonly ?string $dateTo = null,
		int $page = 1,
		int $perPage = 20,
		?string $search = null,
		string $orderBy = 'date',
		string $order = 'DESC',
	) {
		parent::__construct( $page, $perPage, $search, $orderBy, $order );
	}
}
