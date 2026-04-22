<?php

declare(strict_types=1);

namespace AllFeedback\Application\Response\Pipes;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Application\Response\ResponseDTO;
use AllFeedback\Domain\Survey\Survey;

/**
 * Mutable context object passed through the response validation pipeline.
 *
 * @package AllFeedback\Application\Response\Pipes
 * @since   1.0.0
 */
class ResponseContext {

	/**
	 * Whether all pipeline stages have marked the response as valid.
	 *
	 * @var bool
	 * @since 1.0.0
	 */
	public bool $validated = false;

	/**
	 * Accumulated validation error messages keyed by field name.
	 *
	 * @var array<string, string>
	 * @since 1.0.0
	 */
	public array $errors = [];

	/**
	 * @param  ResponseDTO $dto    The validated response payload.
	 * @param  Survey      $survey The target survey aggregate.
	 * @since  1.0.0
	 */
	public function __construct(
		public readonly ResponseDTO $dto,
		public readonly Survey $survey,
	) {}
}
