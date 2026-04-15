<?php
/**
 * Plugin Name: All Feedback
 * Plugin URI:  https://allfeedback.com
 * Description: WordPress-native NPS, CSAT, and CES feedback surveys. All data stored in your database. No external accounts required.
 * Author:      Themegrill
 * Author URI:  https://themegrill.com
 * Version:     1.0.0
 * Requires at least: 6.5
 * Requires PHP: 8.2
 * Text Domain: all-feedback
 * Domain Path: /languages
 * WordPress Available: yes
 * Requires License: no
 *
 * @package AllFeedback
 */

declare(strict_types=1);

use AllFeedback\Core\Constants;
use AllFeedback\Plugin;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}


// Absolute path to the main plugin file — mirrors EVF_PLUGIN_FILE convention.
define( 'AF_PLUGIN_FILE', __FILE__ );

$autoloader = __DIR__ . '/vendor/autoload.php';

if ( ! file_exists( $autoloader ) ) {
	add_action(
		'admin_notices',
		function () {
			printf(
				'<div class="notice notice-error"><p>%s</p></div>',
				esc_html( 'All Feedback: Composer dependencies not found. Please run "composer install".' )
			);
		}
	);
	return;
}

require_once $autoloader;

// ------------------------------------------------------------------
// ThemeGrill SDK
// Versioned loader — whichever installed plugin ships the highest
// SDK version wins. load.php hooks into `init` to boot start.php.
// ------------------------------------------------------------------

$tg_sdk_loader = __DIR__ . '/vendor/themegrill/themegrill-sdk/load.php';
if ( file_exists( $tg_sdk_loader ) ) {
	require_once $tg_sdk_loader;
}

/**
 * Register All Feedback with ThemeGrill SDK.
 * Fires before `init` so start.php picks it up when it reads the filter.
 */
add_filter(
	'themegrill_sdk_products',
	function ( $products ) {
		$products[] = AF_PLUGIN_FILE;
		return $products;
	},
	10,
	1
);

/**
 * Disable SDK promotions and dashboard widgets — we handle our own UI.
 */
add_filter( 'themegrill_sdk_ran_promos', '__return_true' );
add_filter( 'themegrill_sdk_hide_dashboard_widget', '__return_true' );

// ------------------------------------------------------------------
// Bootstrap
// ------------------------------------------------------------------

// Initialise path / URL constants from the current file location.
Constants::init( __FILE__ );

// Boot the plugin (idempotent — safe to call multiple times).
Plugin::getInstance()->boot();

// Activation & deactivation hooks must be called in the main plugin file.
register_activation_hook( __FILE__, fn() => Plugin::getInstance()->activate() );
register_deactivation_hook( __FILE__, fn() => Plugin::getInstance()->deactivate() );
