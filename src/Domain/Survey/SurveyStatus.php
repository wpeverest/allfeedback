<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Survey;

defined( 'ABSPATH' ) || exit;

/**
 * Backed string enum representing the lifecycle state of a Survey.
 *
 * @since 1.0.0
 */
enum SurveyStatus: string {

	case Draft    = 'draft';
	case Active   = 'active';
	case Inactive = 'inactive';
	case Archived = 'archived';

	/**
	 * Return true when this status is Active.
	 *
	 * @since 1.0.0
	 */
	public function isActive(): bool {
		return $this === self::Active;
	}
}
