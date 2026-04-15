<?php

/**
 * Uninstall — executed when the plugin is deleted via WP Admin → Plugins.
 *
 * This file is loaded directly by WordPress (NOT through Composer autoload),
 * so we must not rely on the DI container or any plugin class.
 *
 * Cleanup is only performed when the "Delete data on uninstall" setting is
 * enabled (Settings → Advanced → Plugin Management). If the setting is off,
 * this file exits immediately so survey data and settings are preserved.
 *
 * What gets deleted when the setting is on:
 *  1. Custom database tables (wp_af_surveys, wp_af_responses)
 *  2. All plugin wp_options rows
 *  3. Uploads directory  (wp-content/uploads/allfeedback/)
 *  4. Compiled DI container cache (wp-content/cache/allfeedback/)
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

// ------------------------------------------------------------------
// Guard: only wipe data when the admin explicitly opted in.
// Read directly from wp_options — no plugin classes are available here.
// ------------------------------------------------------------------
$settings = get_option( '_allfb_settings', [] );
$delete   = isset( $settings['advanced']['plugin']['delete_on_uninstall'] )
	? (bool) $settings['advanced']['plugin']['delete_on_uninstall']
	: false;

if ( ! $delete ) {
	return;
}

global $wpdb;

// ------------------------------------------------------------------
// 1. Drop custom database tables
// ------------------------------------------------------------------
$tables = [
	$wpdb->prefix . 'af_responses',
	$wpdb->prefix . 'af_surveys',
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
// 3. Delete uploads directory (log files and any other stored files)
//    Path: wp-content/uploads/allfeedback/
// ------------------------------------------------------------------
$uploads_dir = wp_upload_dir()['basedir'] . '/allfeedback';

allfb_delete_directory( $uploads_dir );

// ------------------------------------------------------------------
// 4. Clear compiled DI container cache
//    Path: wp-content/cache/allfeedback/
// ------------------------------------------------------------------
$cache_dir = WP_CONTENT_DIR . '/cache/allfeedback';

allfb_delete_directory( $cache_dir );

// ------------------------------------------------------------------
// Helper: recursively delete a directory and all its contents.
// ------------------------------------------------------------------

/**
 * Recursively delete a directory and everything inside it.
 *
 * @param string $dir Absolute path to the directory.
 */
function allfb_delete_directory( string $dir ): void {
	if ( ! is_dir( $dir ) ) {
		return;
	}

	$iterator = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator( $dir, RecursiveDirectoryIterator::SKIP_DOTS ),
		RecursiveIteratorIterator::CHILD_FIRST
	);

	foreach ( $iterator as $file ) {
		if ( $file->isDir() ) {
			rmdir( $file->getRealPath() );
		} else {
			unlink( $file->getRealPath() );
		}
	}

	rmdir( $dir );
}
