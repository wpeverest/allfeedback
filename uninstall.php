<?php

/**
 * Uninstall
 *
 * @package AllFeedback
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

require_once ABSPATH . 'wp-admin/includes/file.php';

// ------------------------------------------------------------------
// Guard: only wipe data when the admin explicitly opted in.
// Read directly from wp_options — no plugin classes are available here.
// ------------------------------------------------------------------
$allfeedback_settings = get_option( '_allfb_settings', [] );
$allfeedback_delete   = isset( $allfeedback_settings['advanced']['plugin']['delete_on_uninstall'] )
	? (bool) $allfeedback_settings['advanced']['plugin']['delete_on_uninstall']
	: false;

if ( ! $allfeedback_delete ) {
	return;
}

global $wpdb;

$allfeedback_tables = [
	$wpdb->prefix . 'af_responses',
	$wpdb->prefix . 'af_surveys',
];

foreach ( $allfeedback_tables as $allfeedback_table ) {
	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$wpdb->query( "DROP TABLE IF EXISTS {$allfeedback_table}" );
}


$allfeedback_options = [
	'_allfb_migrations',
	'_allfb_settings',
	'_allfb_features',
	'_allfb_enabled_modules',
	'allfb_rewrite_version',
];

foreach ( $allfeedback_options as $allfeedback_option ) {
	delete_option( $allfeedback_option );
}


$allfeedback_uploads_dir = wp_upload_dir()['basedir'] . '/allfeedback';

allfb_delete_directory( $allfeedback_uploads_dir );


$allfeedback_cache_dir = WP_CONTENT_DIR . '/cache/allfeedback';

allfb_delete_directory( $allfeedback_cache_dir );



/**
 * Recursively delete a directory and everything inside it.
 *
 * @param string $dir Absolute path to the directory.
 */
function allfb_delete_directory( string $dir ): void {
	global $wp_filesystem;

	if ( ! is_dir( $dir ) ) {
		return;
	}

	if ( ! WP_Filesystem() || ! $wp_filesystem ) {
		return;
	}

	$iterator = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator( $dir, RecursiveDirectoryIterator::SKIP_DOTS ),
		RecursiveIteratorIterator::CHILD_FIRST
	);

	foreach ( $iterator as $file ) {
		if ( $file->isDir() ) {
			$wp_filesystem->rmdir( $file->getRealPath(), false );
		} else {
			wp_delete_file( $file->getRealPath() );
		}
	}

	$wp_filesystem->rmdir( $dir, false );
}
