<?php
/**
 * Survey status.
 *
 * @package AllFeedback\Domain\Survey
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Domain\Survey;

defined( 'ABSPATH' ) || exit;

/**
 * Backed string enum representing the lifecycle state of a Survey.
 *
 * Values match the `status` column in the `af_surveys` database table and
 * the `Manager::STATUSES` constant used by the REST API layer.
 *
 * @package AllFeedback\Domain\Survey
 * @since   1.0.0
 */
enum SurveyStatus: string {

	case Draft     = 'draft';
	case Published = 'published';
	case Archived  = 'archived';
	case Trashed   = 'trashed';

	/**
	 * Return true when this status is Published (visible to respondents).
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isPublished(): bool {
		return $this === self::Published;
	}

	/**
	 * Return true when this status is Trashed.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isTrashed(): bool {
		return $this === self::Trashed;
	}
}
