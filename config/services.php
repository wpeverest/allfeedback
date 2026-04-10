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
use AllFeedback\Core\Data\CurrencyData;
use AllFeedback\Core\Data\TimezoneData;
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

// ── Infrastructure — Mail ─────────────────────────────────────────────────────
use AllFeedback\Infrastructure\Mail\Mailer;
use AllFeedback\Infrastructure\Mail\NotificationServiceProvider;
use AllFeedback\Infrastructure\Mail\SendNotificationJob;

// ── Infrastructure — Payment ──────────────────────────────────────────────────
use AllFeedback\Infrastructure\Payment\OfflinePaymentGateway;
use AllFeedback\Infrastructure\Payment\PaymentGateway;

// ── Infrastructure — Google ───────────────────────────────────────────────────
use AllFeedback\Infrastructure\Google\GoogleCalendarService;
use AllFeedback\Infrastructure\Google\GoogleCredentialManager;
use AllFeedback\Infrastructure\Google\GoogleIntegrationProvider;
use AllFeedback\Infrastructure\Google\GoogleOAuthClient;
use AllFeedback\Infrastructure\Google\GoogleTokenManager;
use AllFeedback\Infrastructure\Google\SyncCalendarEventJob;

// ── Infrastructure — Cart ─────────────────────────────────────────────────────
use AllFeedback\Infrastructure\Cart\CartManager;

// ── Infrastructure — Post Types & Taxonomies ──────────────────────────────────
use AllFeedback\Infrastructure\PostTypes\Survey as SurveyPostType;
use AllFeedback\Infrastructure\Taxonomies\SurveyCategory;

// ── API ───────────────────────────────────────────────────────────────────────
use AllFeedback\Admin\AdminServiceProvider;
use AllFeedback\API\ApiServiceProvider;
use AllFeedback\API\Controllers\V1\ContentSearchController;
use AllFeedback\API\Controllers\V1\ResponsesController;
use AllFeedback\API\Controllers\V1\SettingsController;
use AllFeedback\API\Controllers\V1\SubmitController;
use AllFeedback\API\Controllers\V1\SurveysController;
use AllFeedback\Frontend\FrontendServiceProvider;

// ── Legacy survey gateways (still in use by existing controllers) ─────────────
use AllFeedback\Survey\Manager;
use AllFeedback\Survey\ResponseManager;

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
	Logger::class                    => autowire(),
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
	// Static data
	// ------------------------------------------------------------------
	CurrencyData::class              => autowire(),
	TimezoneData::class              => autowire(),

	// ------------------------------------------------------------------
	// i18n
	// ------------------------------------------------------------------
	SurveySchemaTranslator::class    => autowire(),

	// ------------------------------------------------------------------
	// Background jobs
	// ------------------------------------------------------------------
	JobDispatcher::class             => autowire( ActionSchedulerDispatcher::class ),
	ActionSchedulerDispatcher::class => autowire(),
	ActionSchedulerRunner::class     => autowire(),
	SendNotificationJob::class       => autowire(),
	SyncCalendarEventJob::class      => autowire(),

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
	// Infrastructure — Payment
	// ------------------------------------------------------------------
	PaymentGateway::class            => autowire( OfflinePaymentGateway::class ),
	OfflinePaymentGateway::class     => autowire(),

	// ------------------------------------------------------------------
	// Infrastructure — Google
	// ------------------------------------------------------------------
	GoogleTokenManager::class        => autowire(),
	GoogleCredentialManager::class   => autowire(),
	GoogleOAuthClient::class         => autowire(),
	GoogleCalendarService::class     => autowire(),

	// ------------------------------------------------------------------
	// Infrastructure — Cart
	// ------------------------------------------------------------------
	CartManager::class               => autowire(),

	// ------------------------------------------------------------------
	// Infrastructure — Post types & Taxonomies
	// ------------------------------------------------------------------
	SurveyPostType::class            => autowire(),
	SurveyCategory::class            => autowire(),

	// ------------------------------------------------------------------
	// Module system
	// ------------------------------------------------------------------
	ModuleRegistry::class            => factory( fn() => ModuleRegistry::getInstance() ),
	ModuleLoader::class              => autowire(),

	// ------------------------------------------------------------------
	// Legacy survey table gateways (used by existing controllers)
	// ------------------------------------------------------------------
	Manager::class                   => create( Manager::class ),
	ResponseManager::class           => create( ResponseManager::class ),

	// ------------------------------------------------------------------
	// REST API controllers
	// ------------------------------------------------------------------
	SurveysController::class         => autowire(),
	ResponsesController::class       => autowire(),
	SubmitController::class          => autowire(),
	SettingsController::class        => autowire(),
	ContentSearchController::class   => autowire(),

	// ------------------------------------------------------------------
	// Service providers
	// ------------------------------------------------------------------
	AdminServiceProvider::class          => autowire(),
	FrontendServiceProvider::class       => autowire(),
	ApiServiceProvider::class            => autowire(),
	CoreServiceProvider::class           => autowire(),
	AppServiceProvider::class            => autowire(),
	NotificationServiceProvider::class   => autowire(),
	JobServiceProvider::class            => autowire(),
	GoogleIntegrationProvider::class     => autowire(),

];
