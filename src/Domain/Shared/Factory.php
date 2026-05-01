<?php
/**
 * Factory.
 *
 * @package AllFeedback\Domain\Shared
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Domain\Shared;

defined( 'ABSPATH' ) || exit;

/**
 * Generic factory interface for constructing and reconstituting domain entities.
 *
 * @template T of Entity
 *
 * @package AllFeedback\Domain\Shared
 * @since   1.0.0
 */
interface Factory {

	/**
	 * Create a new entity from raw input data.
	 *
	 * @param  array<string, mixed> $data Raw input fields.
	 * @return T
	 * @since  1.0.0
	 */
	public function create( array $data ): Entity;

	/**
	 * Reconstitute an existing entity from persistence data.
	 *
	 * @param  array<string, mixed> $data Persistence row data.
	 * @return T
	 * @since  1.0.0
	 */
	public function fromArray( array $data ): Entity;
}
