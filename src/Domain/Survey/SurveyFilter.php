<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Survey;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Shared\QueryFilter;

/**
 * Query filter for the Survey repository.
 *
 * Extends the base pagination / ordering parameters with Survey-specific
 * constraints for status and authorship.
 *
 * @package AllFeedback\Domain\Survey
 * @since   1.0.0
 */
final class SurveyFilter extends QueryFilter {

	/**
	 * @param  SurveyStatus|null $status    Restrict results to this lifecycle status.
	 * @param  int|null          $createdBy Restrict results to surveys by this user ID.
	 * @param  int               $page      1-based page number.
	 * @param  int               $perPage   Results per page.
	 * @param  string|null       $search    Optional full-text search string.
	 * @param  string            $orderBy   Column to order by. Default 'date'.
	 * @param  string            $order     Sort direction: ASC | DESC.
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly ?SurveyStatus $status = null,
		public readonly ?int $createdBy = null,
		int $page = 1,
		int $perPage = 20,
		?string $search = null,
		string $orderBy = 'date',
		string $order = 'DESC',
	) {
		parent::__construct( $page, $perPage, $search, $orderBy, $order );
	}
}
