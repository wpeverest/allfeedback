<?php
/**
 * Pipe interface.
 *
 * @package AllFeedback\Application\Response\Pipes
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Application\Response\Pipes;

defined( 'ABSPATH' ) || exit;

/**
 * Contract for all response-submission pipeline stages.
 *
 * @package AllFeedback\Application\Response\Pipes
 * @since   1.0.0
 */
interface PipeInterface {

	/**
	 * Execute this pipeline stage.
	 *
	 * @param  ResponseContext $context Shared mutable pipeline context.
	 * @param  \Closure        $next    Advances to the next stage.
	 * @return mixed
	 * @since  1.0.0
	 */
	public function execute( ResponseContext $context, \Closure $next ): mixed;
}
