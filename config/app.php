<?php

defined( 'ABSPATH' ) || exit;

/**
 * Application configuration.
 *
 * Values here are read by Config::class and can be retrieved anywhere via the
 * DI container:  $container->get( Config::class )->get( 'name' )
 */

use AllFeedback\Core\Constants;

return [

	// ------------------------------------------------------------------
	// Identity
	// ------------------------------------------------------------------
	'name'        => 'All Feedback',
	'version'     => Constants::VERSION,
	'slug'        => 'all-feedback',
	'text_domain' => Constants::TEXT_DOMAIN,
	'namespace'   => 'all-feedback/v1', // REST API namespace

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
		'ttl'     => 3600,            // seconds
		'prefix'  => 'allfb_',          // option/transient prefix
	],

];
