<?php
/**
 * All feedback exception.
 *
 * @package AllFeedback\Core\Exceptions
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Core\Exceptions;

defined( 'ABSPATH' ) || exit;

/**
 * Class AllFeedbackException
 *
 * Base exception for all domain-level exceptions thrown within the plugin.
 * Catching this type in a controller is sufficient to handle any plugin-specific error.
 *
 * @package AllFeedback\Core\Exceptions
 * @since   1.0.0
 */
class AllFeedbackException extends \RuntimeException {}
