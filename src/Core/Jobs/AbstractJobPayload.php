<?php
/**
 * Abstract job payload.
 *
 * @package AllFeedback\Core\Jobs
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Core\Jobs;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\Contracts\JobPayload;

/**
 * Class AbstractJobPayload
 *
 * Base class for all job payload value objects in the AllFeedback plugin.
 * Concrete payloads must implement the fromArray() and toArray() methods
 * declared by the JobPayload contract.
 *
 * @package AllFeedback\Core\Jobs
 * @since   1.0.0
 */
abstract class AbstractJobPayload implements JobPayload {
}
