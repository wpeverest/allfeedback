<?php

declare(strict_types=1);

namespace AllFeedback\Traits;

/**
 * Thin wrappers around WordPress action/filter functions.
 *
 * Classes using this trait can register hooks without calling global functions
 * directly, which makes unit-testing and method-level documentation easier.
 *
 * @package AllFeedback\Traits
 * @since   1.0.0
 */
trait Hooks {

	/**
	 * Register a callback on an action hook.
	 *
	 * @param  string                $hookName     Name of the action.
	 * @param  callable|string|array $callback     Callable to run.
	 * @param  int                   $priority     Optional. Default 10.
	 * @param  int                   $acceptedArgs Optional. Default 1.
	 * @return bool
	 * @since  1.0.0
	 */
	public function addAction(
		string $hookName,
		callable|string|array $callback,
		int $priority = 10,
		int $acceptedArgs = 1
	): bool {
		return add_action( $hookName, $callback, $priority, $acceptedArgs );
	}

	/**
	 * Remove a callback from an action hook.
	 *
	 * @param  string                $hookName Name of the action.
	 * @param  callable|string|array $callback The callback to remove.
	 * @param  int                   $priority Optional. Default 10.
	 * @return bool
	 * @since  1.0.0
	 */
	public function removeAction(
		string $hookName,
		callable|string|array $callback,
		int $priority = 10
	): bool {
		return remove_action( $hookName, $callback, $priority );
	}

	/**
	 * Execute all callbacks registered to an action hook.
	 *
	 * @param  string $hookName The action hook to fire.
	 * @param  mixed  ...$args  Additional arguments passed to each callback.
	 * @return void
	 * @since  1.0.0
	 */
	public function doAction( string $hookName, mixed ...$args ): void {
		do_action_ref_array( $hookName, $args );
	}

	/**
	 * Register a callback on a filter hook.
	 *
	 * @param  string                $hookName     Name of the filter.
	 * @param  callable|string|array $callback     Callable to run.
	 * @param  int                   $priority     Optional. Default 10.
	 * @param  int                   $acceptedArgs Optional. Default 1.
	 * @return bool
	 * @since  1.0.0
	 */
	public function addFilter(
		string $hookName,
		callable|string|array $callback,
		int $priority = 10,
		int $acceptedArgs = 1
	): bool {
		return add_filter( $hookName, $callback, $priority, $acceptedArgs );
	}

	/**
	 * Remove a callback from a filter hook.
	 *
	 * @param  string                $hookName Name of the filter.
	 * @param  callable|string|array $callback The callback to remove.
	 * @param  int                   $priority Optional. Default 10.
	 * @return bool
	 * @since  1.0.0
	 */
	public function removeFilter(
		string $hookName,
		callable|string|array $callback,
		int $priority = 10
	): bool {
		return remove_filter( $hookName, $callback, $priority );
	}

	/**
	 * Apply all callbacks registered to a filter hook and return the result.
	 *
	 * @param  string $hookName The filter hook name.
	 * @param  mixed  $value    The value to filter.
	 * @param  mixed  ...$args  Additional arguments passed to each callback.
	 * @return mixed            The filtered value.
	 * @since  1.0.0
	 */
	public function applyFilters( string $hookName, mixed $value, mixed ...$args ): mixed {
		return apply_filters_ref_array( $hookName, array_merge( [ $value ], $args ) );
	}
}
