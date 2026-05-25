<?php
/**
 * Application configuration.
 *
 * Values here are read by Config::class and can be retrieved anywhere via the
 * DI container: $container->get( Config::class )->get( 'name' ).
 *
 * @package AllFeedback
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Constants;

return [

	// ------------------------------------------------------------------
	// Identity
	// ------------------------------------------------------------------
	'name'        => 'All Feedback',
	'version'     => Constants::VERSION,
	'slug'        => 'allfeedback',
	'text_domain' => Constants::TEXT_DOMAIN,
	'namespace'   => 'allfeedback/v1', // REST API namespace.

	// ------------------------------------------------------------------
	// File-system paths (absolute)
	// ------------------------------------------------------------------
	'paths'       => [
		'base'      => Constants::pluginPath(),
		'src'       => Constants::path( 'src/' ),
		'languages' => Constants::path( 'languages/' ),
	],

	// ------------------------------------------------------------------
	// URLs
	// ------------------------------------------------------------------
	'urls'        => [
		'base' => Constants::pluginUrl(),
	],

	// ------------------------------------------------------------------
	// Simple object-cache settings
	// ------------------------------------------------------------------
	'cache'       => [
		'enabled' => true,
		'ttl'     => 3600,            // seconds.
		'prefix'  => 'allfeedback_',     // option/transient prefix.
	],

];
