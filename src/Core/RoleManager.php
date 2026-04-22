<?php

declare(strict_types=1);

namespace AllFeedback\Core;

/**
 * Creates and removes any custom WordPress user roles the plugin needs.
 *
 * Roles are added only on activation and removed on deactivation so they
 * do not accumulate on every page load.
 *
 * @package AllFeedback\Core
 * @since   1.0.0
 */
class RoleManager {

	/**
	 * Create all custom roles required by the plugin.
	 *
	 * Called during plugin activation.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function createRoles(): void {}

	/**
	 * Remove all custom roles created by `createRoles()`.
	 *
	 * Called during plugin deactivation so the database is left clean.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function removeRoles(): void {}
}
