<?php
/**
 * Job payload.
 *
 * @package AllFeedback\Core\Jobs\Contracts
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Core\Jobs\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Interface JobPayload
 *
 * Implemented by every job payload value object. Payloads must be fully
 * serialisable to and from a plain array so that Action Scheduler can store
 * and reconstruct them.
 *
 * @package AllFeedback\Core\Jobs\Contracts
 * @since   1.0.0
 */
interface JobPayload {

	/**
	 * Reconstruct a payload instance from a plain array.
	 *
	 * @param  array<string, mixed> $data Serialised payload data.
	 * @return static
	 * @since  1.0.0
	 */
	public static function fromArray( array $data ): self;

	/**
	 * Serialise this payload to a plain array suitable for storage.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	public function toArray(): array;
}
