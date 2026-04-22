<?php

declare(strict_types=1);

namespace AllFeedback\Core\Exceptions;

defined( 'ABSPATH' ) || exit;

/**
 * Class ValidationException
 *
 * Thrown when incoming data fails business-rule validation.
 * Carries a structured error map (field → messages) that the REST layer
 * serialises into the 422 response body.
 *
 * @package AllFeedback\Core\Exceptions
 * @since   1.0.0
 */
class ValidationException extends AllFeedbackException {

	/**
	 * Keyed error map: field name → array of human-readable error strings.
	 *
	 * @var array<string, string[]>
	 * @since 1.0.0
	 */
	private array $errors = [];

	/**
	 * Replace the entire error map.
	 *
	 * @param  array<string, string[]> $errors Field → messages map.
	 * @return static
	 * @since  1.0.0
	 */
	public function setErrors( array $errors ): static {
		$this->errors = $errors;
		return $this;
	}

	/**
	 * Return the full error map.
	 *
	 * @return array<string, string[]>
	 * @since  1.0.0
	 */
	public function getErrors(): array {
		return $this->errors;
	}

	/**
	 * Build a ValidationException pre-populated with an error map.
	 *
	 * @param  array<string, string[]> $errors  Field → messages map.
	 * @param  string                  $message Top-level exception message.
	 * @return static
	 * @since  1.0.0
	 */
	public static function withErrors( array $errors, string $message = 'Validation failed.' ): static {
		$exception = new static( $message );
		$exception->setErrors( $errors );
		return $exception;
	}
}
