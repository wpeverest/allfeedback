<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Support\Logger;

/**
 * Class SettingsController
 *
 * REST controller for plugin-wide settings.
 *
 * Routes registered (all under all-feedback/v1):
 *   GET   /settings  → index()  : return all current settings with schema
 *   PATCH /settings  → update() : persist one or more settings values
 *
 * Settings live in a single wp_options row managed by SettingsManager.
 * Per-survey settings (trigger, position, GDPR, etc.) are stored in the
 * `settings` JSON blob on each survey row — see SurveysController.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class SettingsController extends RestController {

	/**
	 * @since 1.0.0
	 */
	protected string $restBase = 'settings';

	/**
	 * @param SettingsManager $settingsManager Plugin-wide settings store.
	 * @param Logger          $logger          Structured logger.
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly SettingsManager $settingsManager,
		private readonly Logger $logger,
	) {}

	/**
	 * Register all routes for this controller.
	 *
	 * @since 1.0.0
	 */
	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase,
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'index' ],
					'permission_callback' => [ $this, 'adminPermission' ],
				],
				[
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => $this->settingsArgs(),
				],
				'schema' => [ $this, 'getPublicItemSchema' ],
			]
		);
	}

	// ------------------------------------------------------------------
	// Route handlers
	// ------------------------------------------------------------------

	/**
	 * GET /all-feedback/v1/settings
	 *
	 * Return all current settings merged with their defaults.
	 * Also includes the schema so the React Settings page can render
	 * the correct field type for each setting.
	 *
	 * @return \WP_REST_Response
	 * @since 1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response {
		return $this->successResponse(
			[
				'settings' => $this->settingsManager->all(),
				'schema'   => $this->settingsManager->getSchema(),
			]
		);
	}

	/**
	 * PUT|PATCH /all-feedback/v1/settings
	 *
	 * Persist one or more settings. Keys not defined in SettingsManager::DEFAULTS
	 * are silently ignored. Partial updates are fully supported — you do not
	 * need to send every setting on every request.
	 *
	 * @param \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since 1.0.0
	 */
	public function update( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$body = $request->get_json_params() ?? [];

		if ( empty( $body ) ) {
			return $this->errorResponse( __( 'No settings provided.', 'all-feedback' ), 422 );
		}

		$this->settingsManager->setMultiple( $body );

		$this->logger->info(
			'Plugin settings updated.',
			[ 'keys' => array_keys( $body ), 'user_id' => get_current_user_id() ]
		);

		return $this->successResponse( [ 'settings' => $this->settingsManager->all() ] );
	}

	// ------------------------------------------------------------------
	// Schema
	// ------------------------------------------------------------------

	/**
	 * JSON schema describing the settings resource.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function getPublicItemSchema(): array {
		$schema       = $this->settingsManager->getSchema();
		$properties   = [];

		foreach ( $schema as $key => $definition ) {
			$properties[ $key ] = array_merge(
				[
					'context'  => [ 'view', 'edit' ],
				],
				$definition
			);
		}

		return [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'allfeedback_settings',
			'type'       => 'object',
			'properties' => $properties,
		];
	}

	// ------------------------------------------------------------------
	// Argument schemas
	// ------------------------------------------------------------------

	/**
	 * Build the REST arg descriptors for PUT /settings from the live schema.
	 *
	 * Each schema entry maps directly to the matching argString / argBoolean /
	 * argInteger / argEnum helper so that WordPress validates the incoming
	 * values before they reach update().
	 *
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	private function settingsArgs(): array {
		$schema = $this->settingsManager->getSchema();
		$args   = [];

		foreach ( $schema as $key => $definition ) {
			$type = $definition['type'] ?? 'string';

			if ( $type === 'boolean' ) {
				$args[ $key ] = $this->argBoolean(
					description: $definition['description'] ?? '',
					default:     (bool) ( $definition['default'] ?? false ),
				);
				continue;
			}

			if ( $type === 'integer' ) {
				$args[ $key ] = $this->argInteger(
					description: $definition['description'] ?? '',
					min:         $definition['minimum'] ?? 0,
					max:         $definition['maximum'] ?? null,
					default:     $definition['default'] ?? null,
				);
				continue;
			}

			if ( isset( $definition['enum'] ) ) {
				$args[ $key ] = $this->argEnum(
					description: $definition['description'] ?? '',
					values:      $definition['enum'],
					default:     $definition['default'] ?? null,
				);
				continue;
			}

			// Plain string.
			$args[ $key ] = $this->argString(
				description: $definition['description'] ?? '',
				default:     $definition['default'] ?? null,
			);
		}

		return $args;
	}
}
