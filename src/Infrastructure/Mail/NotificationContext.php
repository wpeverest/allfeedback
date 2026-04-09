<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Response\Response;
use AllFeedback\Domain\Survey\Survey;

/**
 * Immutable context object passed to notification classes when sending emails.
 *
 * Carries the Survey aggregate and (optionally) the Response aggregate so that
 * notification templates can reference both without additional repository calls.
 *
 * @since 1.0.0
 */
final class NotificationContext {

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		public readonly Survey $survey,
		public readonly ?Response $response = null,
	) {}

	/**
	 * Return the Survey aggregate.
	 *
	 * @since 1.0.0
	 */
	public function getSurvey(): Survey {
		return $this->survey;
	}

	/**
	 * Return the Response aggregate, or null when the context is survey-only.
	 *
	 * @since 1.0.0
	 */
	public function getResponse(): ?Response {
		return $this->response;
	}

	/**
	 * Return true when a Response is available in this context.
	 *
	 * @since 1.0.0
	 */
	public function hasResponse(): bool {
		return $this->response !== null;
	}
}
