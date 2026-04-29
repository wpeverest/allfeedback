<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\AbstractJobPayload;

/**
 * Payload value object for SendWeeklyDigestJob.
 *
 * The weekly digest is site-wide — no survey or response IDs are needed.
 *
 * @package AllFeedback\Infrastructure\Mail
 * @since   1.0.0
 */
class SendWeeklyDigestJobPayload extends AbstractJobPayload {

	/**
	 * Reconstruct the payload from a serialised array (always returns an empty instance).
	 *
	 * @param  array<string, mixed> $data Serialised payload data.
	 * @return self
	 * @since  1.0.0
	 */
	public static function fromArray( array $data ): self {
		return new self();
	}

	/**
	 * Serialise the payload to an empty array.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	public function toArray(): array {
		return [];
	}
}
