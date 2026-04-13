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
 *   GET   /settings → index()  : return the current flat settings object
 *   PATCH /settings → update() : persist one or more settings values
 *
 * Response shape (both endpoints):
 *   { "success": true, "data": { "widget_color": "…", "widget_position": "…", … } }
 *
 * The `data` object is a flat key → value map (no nesting). The TypeScript
 * `Settings` type maps to this shape exactly.
 *
 * Settings are managed by SettingsManager which stores everything in a single
 * `wp_options` row (`_allfb_settings`) for efficiency.
 *
 * Per-survey settings (trigger, targeting, GDPR, etc.) live in the JSON
 * `settings` column on each survey row — see SurveysController for those.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class SettingsController extends RestController {

	/**
	 * REST resource slug for this controller.
	 *
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
					'methods'             => \WP_REST_Server::EDITABLE, // PUT + PATCH
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
	 * Return the current plugin-wide settings as a flat key → value object,
	 * merged with defaults so every key is always present in the response.
	 *
	 * The TypeScript `Settings` type maps directly to this flat shape — there
	 * is no `settings` or `schema` wrapper. Clients can use values immediately:
	 *   `data.widget_color`, `data.logging_enabled`, etc.
	 *
	 * @param \WP_REST_Request $request Full request data (unused but required by WP callback contract).
	 * @return \WP_REST_Response
	 * @since 1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response {
		return $this->successResponse( $this->settingsManager->all() );
	}

	/**
	 * PUT|PATCH /all-feedback/v1/settings
	 *
	 * Persist one or more plugin-wide settings in a single atomic write.
	 * Partial updates are fully supported — send only the keys that changed.
	 * Keys not defined in SettingsManager::DEFAULTS are silently ignored.
	 *
	 * The response is the same flat settings object as GET /settings, always
	 * reflecting the current persisted state after the update.
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
			[
				'keys'    => array_keys( $body ),
				'user_id' => get_current_user_id(),
			]
		);

		return $this->successResponse( $this->settingsManager->all() );
	}

	// ------------------------------------------------------------------
	// JSON Schema
	// ------------------------------------------------------------------

	/**
	 * JSON Schema for the settings resource.
	 *
	 * Returned at the `schema` key alongside GET/PATCH routes and exposed
	 * via `GET /wp-json/all-feedback/v1/settings/schema`. WP REST API
	 * clients and tools like Postman can use this to understand the shape.
	 *
	 * @return array<string, mixed>
	 * @since 1.0.0
	 */
	public function getPublicItemSchema(): array {
		$properties = [];

		foreach ( $this->settingsManager->getSchema() as $key => $definition ) {
			$properties[ $key ] = array_merge(
				[ 'context' => [ 'view', 'edit' ] ],
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
	// Argument schema builders
	// ------------------------------------------------------------------

	/**
	 * Build the WP REST arg descriptors for PUT|PATCH /settings.
	 *
	 * Derived entirely from SettingsManager::getSchema() so there is a single
	 * source of truth — adding a setting to the schema automatically exposes
	 * it here with correct WP REST validation.
	 *
	 * Mapping rules:
	 *   schema `type: boolean`                  → argBoolean()
	 *   schema `type: integer`                  → argInteger() with min/max when present
	 *   schema with `enum` key                  → argEnum()
	 *   schema `type: string` (no enum)         → argString()
	 *
	 * @return array<string, array<string, mixed>>
	 * @since 1.0.0
	 */
	private function settingsArgs(): array {
		$schema = $this->settingsManager->getSchema();
		$args   = [];

		foreach ( $schema as $key => $definition ) {
			$type        = $definition['type']        ?? 'string';
			$description = $definition['description'] ?? '';
			$default     = $definition['default']     ?? null;

			if ( $type === 'boolean' ) {
				$args[ $key ] = $this->argBoolean(
					description: $description,
					default:     (bool) $default,
				);
				continue;
			}

			if ( $type === 'integer' ) {
				$args[ $key ] = $this->argInteger(
					description: $description,
					min:         $definition['minimum'] ?? 0,
					max:         isset( $definition['maximum'] ) ? (int) $definition['maximum'] : null,
					default:     $default,
				);
				continue;
			}

			if ( isset( $definition['enum'] ) ) {
				$args[ $key ] = $this->argEnum(
					description: $description,
					values:      $definition['enum'],
					default:     $default,
				);
				continue;
			}

			// Plain string (no enum constraint).
			$args[ $key ] = $this->argString(
				description: $description,
				default:     $default,
			);
		}

		return $args;
	}
}
