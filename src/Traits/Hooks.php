<?php
/**
 * Hooks.
 *
 * @package AllFeedback\Traits
 * @since   1.0.0
 */

namespace AllFeedback\Traits;

defined( 'ABSPATH' ) || exit;

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
	 * @param  string                $hook_name     Name of the action.
	 * @param  callable|string|array $callback     Callable to run.
	 * @param  int                   $priority     Optional. Default 10.
	 * @param  int                   $accepted_args Optional. Default 1.
	 * @return bool
	 * @since  1.0.0
	 */
	public function addAction(
		string $hook_name,
		callable|string|array $callback,
		int $priority = 10,
		int $accepted_args = 1
	): bool {
		return add_action( $hook_name, $callback, $priority, $accepted_args );
	}

	/**
	 * Remove a callback from an action hook.
	 *
	 * @param  string                $hook_name Name of the action.
	 * @param  callable|string|array $callback The callback to remove.
	 * @param  int                   $priority Optional. Default 10.
	 * @return bool
	 * @since  1.0.0
	 */
	public function removeAction(
		string $hook_name,
		callable|string|array $callback,
		int $priority = 10
	): bool {
		return remove_action( $hook_name, $callback, $priority );
	}

	/**
	 * Execute all callbacks registered to an action hook.
	 *
	 * @param  string $hook_name The action hook to fire.
	 * @param  mixed  ...$args  Additional arguments passed to each callback.
	 * @return void
	 * @since  1.0.0
	 */
	public function doAction( string $hook_name, mixed ...$args ): void {
		do_action( $hook_name, ...$args ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound
	}

	/**
	 * Register a callback on a filter hook.
	 *
	 * @param  string                $hook_name     Name of the filter.
	 * @param  callable|string|array $callback     Callable to run.
	 * @param  int                   $priority     Optional. Default 10.
	 * @param  int                   $accepted_args Optional. Default 1.
	 * @return bool
	 * @since  1.0.0
	 */
	public function addFilter(
		string $hook_name,
		callable|string|array $callback,
		int $priority = 10,
		int $accepted_args = 1
	): bool {
		return add_filter( $hook_name, $callback, $priority, $accepted_args );
	}

	/**
	 * Remove a callback from a filter hook.
	 *
	 * @param  string                $hook_name Name of the filter.
	 * @param  callable|string|array $callback The callback to remove.
	 * @param  int                   $priority Optional. Default 10.
	 * @return bool
	 * @since  1.0.0
	 */
	public function removeFilter(
		string $hook_name,
		callable|string|array $callback,
		int $priority = 10
	): bool {
		return remove_filter( $hook_name, $callback, $priority );
	}

	/**
	 * Apply all callbacks registered to a filter hook and return the result.
	 *
	 * @param  string $hook_name The filter hook name.
	 * @param  mixed  $value    The value to filter.
	 * @param  mixed  ...$args  Additional arguments passed to each callback.
	 * @return mixed            The filtered value.
	 * @since  1.0.0
	 */
	public function applyFilters( string $hook_name, mixed $value, mixed ...$args ): mixed {
		return apply_filters( $hook_name, $value, ...$args ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound
	}
}
