<?php

/**
 * Uninstall — executed when the plugin is deleted via WP Admin → Plugins.
 *
 * This file is loaded directly by WordPress (NOT through Composer autoload),
 * so we must guard against direct access and require no autoloader.
 *
 * What this does:
 *  - Drop all custom database tables.
 *  - Delete all plugin wp_options entries.
 *  - Clear the compiled DI container cache from wp-content/cache/.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

// ------------------------------------------------------------------
// 1. Drop custom tables
//    List every table created in database/migrations/ here.
// ------------------------------------------------------------------
$tables = [
	$wpdb->prefix . 'allfb_items',
	// Add more tables as you create migrations, e.g.:
	// $wpdb->prefix . 'allfb_orders',
];

foreach ( $tables as $table ) {
	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$wpdb->query( "DROP TABLE IF EXISTS {$table}" );
}

// ------------------------------------------------------------------
// 2. Delete plugin options
// ------------------------------------------------------------------
$options = [
	'_allfb_migrations',      // Migrator — list of run migrations.
	'_allfb_settings',        // SettingsManager — all plugin settings.
	'_allfb_features',        // FeatureManager — feature-flag states.
	'_allfb_enabled_modules', // ModuleLoader — which modules are on.
	'allfb_rewrite_version',  // Plugin — rewrite-flush tracking.
];

foreach ( $options as $option ) {
	delete_option( $option );
}

// ------------------------------------------------------------------
// 3. Clear compiled DI container cache
// ------------------------------------------------------------------
$cache_dir = WP_CONTENT_DIR . '/cache/all-feedback';

if ( is_dir( $cache_dir ) ) {
	$files = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator( $cache_dir, RecursiveDirectoryIterator::SKIP_DOTS ),
		RecursiveIteratorIterator::CHILD_FIRST
	);

	foreach ( $files as $file ) {
		if ( $file->isDir() ) {
			rmdir( $file->getRealPath() );
		} else {
			unlink( $file->getRealPath() );
		}
	}

	rmdir( $cache_dir );
}
