<?php

/**
 * Dependency-injection container definitions.
 *
 * Loaded by Container::buildContainer() via PHP-DI.
 * Add new service / manager / controller bindings here as the plugin grows.
 *
 * @see https://php-di.org/doc/php-definitions.html
 */

declare(strict_types=1);

// ── Support ───────────────────────────────────────────────────────────────────
use AllFeedback\Support\AssetManager;
use AllFeedback\Support\Config;
use AllFeedback\Support\Logger;
use AllFeedback\Support\TemplateLoader;

// ── Core ──────────────────────────────────────────────────────────────────────
use AllFeedback\Core\AppServiceProvider;
use AllFeedback\Core\Cache\CacheManager;
use AllFeedback\Core\CoreServiceProvider;
use AllFeedback\Core\Database\Transaction;
use AllFeedback\Core\Events\EventDispatcher;
use AllFeedback\Core\Features\FeatureManager;
use AllFeedback\Core\I18n\SurveySchemaTranslator;
use AllFeedback\Core\Jobs\Contracts\JobDispatcher;
use AllFeedback\Core\Jobs\JobServiceProvider;
use AllFeedback\Core\Pipeline\Pipeline;
use AllFeedback\Core\RoleManager;
use AllFeedback\Core\Settings\SettingsManager;

// ── Domain — Survey ───────────────────────────────────────────────────────────
use AllFeedback\Domain\Survey\SurveyRepository;

// ── Domain — Response ─────────────────────────────────────────────────────────
use AllFeedback\Domain\Response\ResponseRepository;

// ── Application — Survey ──────────────────────────────────────────────────────
use AllFeedback\Application\Survey\CreateSurveyService;
use AllFeedback\Application\Survey\DeleteSurveyService;
use AllFeedback\Application\Survey\SurveyAnalyticsService;
use AllFeedback\Application\Survey\SurveyQueryService;
use AllFeedback\Application\Survey\UpdateSurveyService;

// ── Application — Response ────────────────────────────────────────────────────
use AllFeedback\Application\Response\ResponseQueryService;
use AllFeedback\Application\Response\SubmitResponseService;

// ── Infrastructure — Repositories ─────────────────────────────────────────────
use AllFeedback\Infrastructure\Database\Migrator;
use AllFeedback\Infrastructure\Database\Repositories\WpdbResponseRepository;
use AllFeedback\Infrastructure\Database\Repositories\WpdbSurveyRepository;

// ── Infrastructure — Jobs ─────────────────────────────────────────────────────
use AllFeedback\Infrastructure\Jobs\ActionSchedulerDispatcher;
use AllFeedback\Infrastructure\Jobs\ActionSchedulerRunner;
use AllFeedback\Infrastructure\Jobs\SynchronousJobDispatcher;

// ── Infrastructure — Mail ─────────────────────────────────────────────────────
use AllFeedback\Infrastructure\Mail\Mailer;
use AllFeedback\Infrastructure\Mail\NotificationServiceProvider;
use AllFeedback\Infrastructure\Mail\SendNotificationJob;

// ── API ───────────────────────────────────────────────────────────────────────
use AllFeedback\Admin\AdminServiceProvider;
use AllFeedback\API\ApiServiceProvider;
use AllFeedback\API\Controllers\V1\ContentSearchController;
use AllFeedback\API\Controllers\V1\LogsController;
use AllFeedback\API\Controllers\V1\ResponsesController;
use AllFeedback\API\Controllers\V1\SettingsController;
use AllFeedback\API\Controllers\V1\SubmitController;
use AllFeedback\API\Controllers\V1\SurveysController;
use AllFeedback\Frontend\FrontendServiceProvider;
use AllFeedback\Frontend\TargetingEngine;

// ── Modules ───────────────────────────────────────────────────────────────────
use AllFeedback\Modules\ModuleLoader;
use AllFeedback\Modules\ModuleRegistry;

use function DI\{autowire, create, factory, get};

return [

	// ------------------------------------------------------------------
	// Configuration
	// ------------------------------------------------------------------
	Config::class                    => create( Config::class )->constructor( get( 'config.app' ) ),

	// ------------------------------------------------------------------
	// Support services
	// ------------------------------------------------------------------
	Logger::class                    => autowire( Logger::class ),
	AssetManager::class              => autowire(),
	TemplateLoader::class            => autowire(),

	// ------------------------------------------------------------------
	// Core infrastructure
	// ------------------------------------------------------------------
	Migrator::class                  => create( Migrator::class ),
	RoleManager::class               => create( RoleManager::class ),
	Transaction::class               => autowire(),

	// ------------------------------------------------------------------
	// Feature flags & settings
	// ------------------------------------------------------------------
	FeatureManager::class            => create( FeatureManager::class ),
	SettingsManager::class           => create( SettingsManager::class ),

	// ------------------------------------------------------------------
	// Events
	// ------------------------------------------------------------------
	EventDispatcher::class           => autowire(),

	// ------------------------------------------------------------------
	// Cache
	// ------------------------------------------------------------------
	CacheManager::class              => autowire(),

	// ------------------------------------------------------------------
	// Pipeline
	// ------------------------------------------------------------------
	Pipeline::class                  => autowire(),

	// ------------------------------------------------------------------
	// i18n
	// ------------------------------------------------------------------
	SurveySchemaTranslator::class    => autowire(),

	// ------------------------------------------------------------------
	// Background jobs
	// ------------------------------------------------------------------
	// Automatically select the async AS dispatcher when Action Scheduler is
	// loaded (JobServiceProvider::boot() ensures it is loaded first), or fall
	// back to the synchronous in-process dispatcher when AS is unavailable.
	JobDispatcher::class             => factory( function () {
		if ( function_exists( 'as_schedule_single_action' ) ) {
			return new ActionSchedulerDispatcher();
		}
		return new SynchronousJobDispatcher();
	} ),
	ActionSchedulerDispatcher::class => autowire(),
	SynchronousJobDispatcher::class  => autowire(),
	ActionSchedulerRunner::class     => autowire(),
	SendNotificationJob::class       => autowire(),

	// ------------------------------------------------------------------
	// Domain → Infrastructure repository bindings
	// ------------------------------------------------------------------
	SurveyRepository::class          => autowire( WpdbSurveyRepository::class ),
	ResponseRepository::class        => autowire( WpdbResponseRepository::class ),
	WpdbSurveyRepository::class      => autowire(),
	WpdbResponseRepository::class    => autowire(),

	// ------------------------------------------------------------------
	// Application services — Survey
	// ------------------------------------------------------------------
	CreateSurveyService::class       => autowire(),
	UpdateSurveyService::class       => autowire(),
	DeleteSurveyService::class       => autowire(),
	SurveyQueryService::class        => autowire(),
	SurveyAnalyticsService::class    => autowire(),

	// ------------------------------------------------------------------
	// Application services — Response
	// ------------------------------------------------------------------
	SubmitResponseService::class     => autowire(),
	ResponseQueryService::class      => autowire(),

	// ------------------------------------------------------------------
	// Infrastructure — Mail
	// ------------------------------------------------------------------
	Mailer::class                    => autowire(),

	// ------------------------------------------------------------------
	// Module system
	// ------------------------------------------------------------------
	ModuleRegistry::class            => factory( fn() => ModuleRegistry::getInstance() ),
	ModuleLoader::class              => autowire(),

	// ------------------------------------------------------------------
	// REST API controllers
	// ------------------------------------------------------------------
	SurveysController::class         => autowire(),
	ResponsesController::class       => autowire(),
	SubmitController::class          => autowire(),
	SettingsController::class        => autowire(),
	ContentSearchController::class   => autowire(),
	LogsController::class            => autowire(),

	// ------------------------------------------------------------------
	// Service providers
	// ------------------------------------------------------------------
	AdminServiceProvider::class          => autowire(),
	FrontendServiceProvider::class       => autowire(),
	TargetingEngine::class               => autowire(),
	ApiServiceProvider::class            => autowire(),
	CoreServiceProvider::class           => autowire(),
	AppServiceProvider::class            => autowire(),
	NotificationServiceProvider::class   => autowire(),
	JobServiceProvider::class            => autowire(),

];
