<?php

/**
 * Dependency-injection container definitions.
 *
 * Loaded by Container::buildContainer() via PHP-DI.
 * Add new service / repository bindings here as the plugin grows.
 *
 * @see https://php-di.org/doc/php-definitions.html
 */

declare(strict_types=1);

use AllFeedback\Admin\AdminServiceProvider;
use AllFeedback\API\ApiServiceProvider;
use AllFeedback\API\Controllers\V1\ResponsesController;
use AllFeedback\API\Controllers\V1\SurveysController;
use AllFeedback\Core\AppServiceProvider;
use AllFeedback\Core\CoreServiceProvider;
use AllFeedback\Core\Features\FeatureManager;
use AllFeedback\Core\RoleManager;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Frontend\FrontendServiceProvider;
use AllFeedback\Infrastructure\Database\Migrator;
use AllFeedback\Modules\ModuleLoader;
use AllFeedback\Modules\ModuleRegistry;
use AllFeedback\Support\AssetManager;
use AllFeedback\Support\Config;
use AllFeedback\Support\Logger;
use AllFeedback\Survey\Manager;

use function DI\{autowire, create, factory, get};

return [

	// ------------------------------------------------------------------
	// Configuration
	// ------------------------------------------------------------------
	Config::class                  => create( Config::class )->constructor( get( 'config.app' ) ),

	// ------------------------------------------------------------------
	// Support services
	// ------------------------------------------------------------------
	Logger::class                  => autowire(),
	AssetManager::class            => autowire(),

	// ------------------------------------------------------------------
	// Core infrastructure
	// ------------------------------------------------------------------
	Migrator::class                => create( Migrator::class ),
	RoleManager::class             => create( RoleManager::class ),

	// ------------------------------------------------------------------
	// Feature flags & settings
	// ------------------------------------------------------------------
	FeatureManager::class          => create( FeatureManager::class ),
	SettingsManager::class         => create( SettingsManager::class ),

	// ------------------------------------------------------------------
	// Module system
	// ------------------------------------------------------------------
	ModuleRegistry::class          => factory( fn() => ModuleRegistry::getInstance() ),
	ModuleLoader::class            => autowire(),

	// ------------------------------------------------------------------
	// Survey
	// ------------------------------------------------------------------
	Manager::class                 => create( Manager::class ),

	// ------------------------------------------------------------------
	// REST API controllers
	// ------------------------------------------------------------------
	SurveysController::class       => autowire(),
	ResponsesController::class     => autowire(),

	// ------------------------------------------------------------------
	// Service providers
	// ------------------------------------------------------------------
	AdminServiceProvider::class    => autowire(),
	FrontendServiceProvider::class => autowire(),
	ApiServiceProvider::class      => autowire(),
	CoreServiceProvider::class     => autowire(),
	AppServiceProvider::class      => autowire(),

];
