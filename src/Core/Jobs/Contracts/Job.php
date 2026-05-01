<?php
/**
 * Job.
 *
 * @package AllFeedback\Core\Jobs\Contracts
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Core\Jobs\Contracts;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\AbstractJobPayload;

/**
 * Interface Job
 *
 * Implemented by every background job class in the AllFeedback plugin.
 * Service dependencies are injected via the constructor (autowired by the DI
 * container). Payload data is supplied at execution time via handle().
 *
 * @package AllFeedback\Core\Jobs\Contracts
 * @since   1.0.0
 */
interface Job {

	/**
	 * Execute the job with the given payload.
	 *
	 * Constructor receives only service dependencies (autowired by DI).
	 * Payload data is passed here at execution time.
	 *
	 * @param  AbstractJobPayload $payload The typed payload for this job run.
	 * @return void
	 * @since  1.0.0
	 */
	public function handle( AbstractJobPayload $payload ): void;

	/**
	 * Reconstruct a typed payload from a serialised array.
	 *
	 * @param  array<string, mixed> $data Serialised payload data.
	 * @return AbstractJobPayload
	 * @since  1.0.0
	 */
	public static function payloadFromArray( array $data ): AbstractJobPayload;
}
