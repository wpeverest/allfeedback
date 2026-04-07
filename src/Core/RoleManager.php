<?php

declare(strict_types=1);

namespace AllFeedback\Core;

/**
 * Class RoleManager
 *
 * Creates and removes any custom WordPress user roles the plugin needs.
 * Extend this class when you introduce new roles.
 *
 * Roles are only added on activation and removed on deactivation so they
 * don't accumulate on every page load.
 */
class RoleManager {

	// Add your custom role slugs as constants here, e.g.:
	// public const ROLE_MANAGER = 'allfb_manager';

	/**
	 * Create all custom roles required by the plugin.
	 * Called during plugin activation.
	 */
	public function createRoles(): void {
		// Example — uncomment and adapt as needed:
		//
		// add_role(
		//     self::ROLE_MANAGER,
		//     __( 'RMB Manager', 'all-feedback' ),
		//     [
		//         'read'           => true,
		//         'edit_posts'     => false,
		//         'delete_posts'   => false,
		//         'upload_files'   => true,
		//     ]
		// );
	}

	/**
	 * Remove all custom roles created by createRoles().
	 * Called during plugin deactivation so the database is left clean.
	 */
	public function removeRoles(): void {
		// Example — mirror every add_role() call with remove_role():
		//
		// remove_role( self::ROLE_MANAGER );
	}
}
