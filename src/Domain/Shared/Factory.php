<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Shared;

defined( 'ABSPATH' ) || exit;

/**
 * Generic factory interface for constructing and reconstituting domain entities.
 *
 * @template T of Entity
 *
 * @since 1.0.0
 */
interface Factory {

	/**
	 * Create a new entity from raw input data.
	 *
	 * @return T
	 *
	 * @since 1.0.0
	 */
	public function create( array $data ): Entity;

	/**
	 * Reconstitute an existing entity from persistence data.
	 *
	 * @return T
	 *
	 * @since 1.0.0
	 */
	public function fromArray( array $data ): Entity;
}
