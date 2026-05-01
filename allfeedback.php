<?php
/**
 * Plugin Name: All Feedback
 * Plugin URI:  https://allfeedback.com
 * Description: Collect customer feedback with customizable feedback forms. All responses are stored in your own WordPress database — no external accounts required.
 * Author:      Themegrill
 * Author URI:  https://themegrill.com
 * Version:     1.0.0
 * Requires at least: 6.5
 * Requires PHP: 8.2
 * Text Domain: allfeedback
 * Domain Path: /languages
 * License:     GPLv3 or later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
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

$af_autoloader = __DIR__ . '/vendor/autoload.php';

if ( ! file_exists( $af_autoloader ) ) {
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

require_once $af_autoloader;
require_once __DIR__ . '/src/Support/helpers.php';

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
