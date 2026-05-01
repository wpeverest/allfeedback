<?php
/**
 * Resolver interface.
 *
 * @package AllFeedback\Core\Contracts
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Core\Contracts;

defined( 'ABSPATH' ) || exit;

/**
 * Interface ResolverInterface
 *
 * Abstraction over a dependency-injection container that can build and return
 * an instance for a given identifier.
 *
 * @package AllFeedback\Core\Contracts
 * @since   1.0.0
 */
interface ResolverInterface {

	/**
	 * Build and return the object bound to the given identifier.
	 *
	 * @param string               $id         Class name or binding alias.
	 * @param array<string, mixed> $parameters Optional constructor overrides.
	 * @return mixed
	 * @since 1.0.0
	 */
	public function make( string $id, array $parameters = [] ): mixed;
}
