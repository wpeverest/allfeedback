<?php

declare(strict_types=1);

namespace AllFeedback\Core\Jobs;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Jobs\Contracts\Job;

/**
 * Class AbstractJob
 *
 * Base class for all background jobs in the AllFeedback plugin.
 * Concrete jobs must implement the handle() and payloadFromArray() methods
 * declared by the Job contract.
 *
 * @since 1.0.0
 */
abstract class AbstractJob implements Job {
}
