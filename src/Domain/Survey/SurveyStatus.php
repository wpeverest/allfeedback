<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Survey;

defined( 'ABSPATH' ) || exit;

/**
 * Backed string enum representing the lifecycle state of a Survey.
 *
 * Values match the `status` column in the `af_surveys` database table and
 * the `Manager::STATUSES` constant used by the REST API layer.
 *
 * @since 1.0.0
 */
enum SurveyStatus: string {

	case Draft     = 'draft';
	case Published = 'published';
	case Archived  = 'archived';

	/**
	 * Return true when this status is Published (visible to respondents).
	 *
	 * @since 1.0.0
	 */
	public function isPublished(): bool {
		return $this === self::Published;
	}
}
