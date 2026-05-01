<?php
/**
 * Survey filter.
 *
 * @package AllFeedback\Domain\Survey
 * @since   1.0.0
 */

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
	 * Constructor.
	 *
	 * @param  SurveyStatus|null $status       Restrict results to this lifecycle status.
	 * @param  int|null          $created_by    Restrict results to surveys by this user ID.
	 * @param  int               $page         1-based page number.
	 * @param  int               $per_page      Results per page.
	 * @param  string|null       $search       Optional full-text search string.
	 * @param  string            $order_by      Column to order by. Default 'date'.
	 * @param  string            $order        Sort direction: ASC | DESC.
	 * @param  string|null       $created_after Only include surveys created on or after this date (Y-m-d).
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly ?SurveyStatus $status = null,
		public readonly ?int $created_by = null,
		int $page = 1,
		int $per_page = 20,
		?string $search = null,
		string $order_by = 'date',
		string $order = 'DESC',
		public readonly ?string $created_after = null,
	) {
		parent::__construct( $page, $per_page, $search, $order_by, $order );
	}
}
