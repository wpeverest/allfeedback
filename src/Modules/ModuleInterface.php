<?php

declare(strict_types=1);

namespace AllFeedback\Modules;

defined( 'ABSPATH' ) || exit;

/**
 * Interface ModuleInterface
 *
 * Every add-on module must implement this contract.
 * The ModuleLoader resolves the dependency graph, then calls:
 *   1. register() on ALL modules
 *   2. boot()     on ENABLED modules only (in dependency order)
 *
 * @package AllFeedback\Modules
 * @since   1.0.0
 */
interface ModuleInterface {

	/**
	 * Register services, listeners, and DI bindings.
	 * Called before boot() so all modules can declare their dependencies.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function register(): void;

	/**
	 * Boot the module (register WP hooks, routes, etc.).
	 * Only called when isEnabled() === true and after all modules are registered.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function boot(): void;

	/**
	 * Whether this module is currently active.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isEnabled(): bool;

	/**
	 * Unique slug, e.g. 'sample-module'.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getId(): string;

	/**
	 * Human-readable display name shown in the admin Modules screen.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getName(): string;

	/**
	 * One-line description.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getDescription(): string;

	/**
	 * Semantic version string, e.g. '1.0.0'.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getVersion(): string;

	/**
	 * IDs of modules this module depends on.
	 * The loader boots dependencies before this module.
	 *
	 * @return string[]
	 * @since  1.0.0
	 */
	public function getDependencies(): array;

	/**
	 * Enable the module and persist the state.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function enable(): void;

	/**
	 * Disable the module and persist the state.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function disable(): void;
}
