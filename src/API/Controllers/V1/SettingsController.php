<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Infrastructure\Mail\Mailer;
use AllFeedback\Support\Logger;

/**
 * REST controller for plugin-wide settings.
 *
 * Routes (under allfeedback/v1):
 *   GET   /settings            → index()     : return full three-level settings object
 *   PATCH /settings            → update()    : persist one or more pages/sections/fields
 *   POST  /settings/test-email → testEmail() : send a test email to the configured address
 *
 * ── Response shape ────────────────────────────────────────────────────────────
 *
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "general":  { "widget":  { "color": "#6366F1", "position": "bottom-right", … } },
 *     "advanced": { "privacy": { "disable_user_details": false },
 *                   "logging": { "enabled": false, "level": "error", "retention_days": 30 },
 *                   "plugin":  { "delete_on_uninstall": false } }
 *   }
 * }
 * ```
 *
 * ── PATCH body — send only what changed ──────────────────────────────────────
 *
 * ```json
 * { "advanced": { "logging": { "enabled": true, "level": "debug" } } }
 * ```
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class SettingsController extends RestController {

	/**
	 * REST resource slug.
	 *
	 * @since 1.0.0
	 */
	protected string $restBase = 'settings';

	/**
	 * @param  SettingsManager $settingsManager Plugin-wide settings store.
	 * @param  Mailer          $mailer          Email dispatcher for the test-email endpoint.
	 * @param  Logger          $logger          Structured logger.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SettingsManager $settingsManager,
		private readonly Mailer $mailer,
		private readonly Logger $logger,
	) {}

	/**
	 * Register all routes for this controller.
	 *
	 * @return void
	 * @since  1.0.0
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

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/test-email',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'testEmail' ],
				'permission_callback' => [ $this, 'adminPermission' ],
			]
		);
	}

	/**
	 * GET /allfeedback/v1/settings
	 *
	 * Return the complete three-level settings object merged with defaults.
	 * Every page, section, and field is always present so the client never
	 * needs to handle undefined keys.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response
	 * @since  1.0.0
	 */
	public function index( \WP_REST_Request $request ): \WP_REST_Response {
		return $this->successResponse( $this->settingsManager->all() );
	}

	/**
	 * PUT|PATCH /allfeedback/v1/settings
	 *
	 * Persist one or more pages / sections / fields in a single atomic write.
	 * Partial updates are fully supported at every level — send only the
	 * pages/sections/fields that changed.
	 *
	 * The response is the complete settings object after the update.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function update( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$body = $request->get_json_params() ?? [];

		if ( empty( $body ) ) {
			return $this->errorResponse( __( 'No settings provided.', 'allfeedback' ), 422 );
		}

		$this->settingsManager->setMultiple( $body );

		$this->logger->info(
			'Plugin settings updated.',
			[
				'pages'   => array_keys( array_filter( $body, 'is_array' ) ),
				'user_id' => get_current_user_id(),
			]
		);

		return $this->successResponse( $this->settingsManager->all() );
	}

	/**
	 * POST /allfeedback/v1/settings/test-email
	 *
	 * Send a test email to the configured "To email" address (falls back to the
	 * WordPress admin email) to verify that the delivery settings are correct.
	 *
	 * The email uses the same Mailer pipeline — including the HTML layout,
	 * From name, From address, and Reply-To — as real notification emails so
	 * it is a true end-to-end deliverability test.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response
	 * @since  1.0.0
	 */
	public function testEmail( \WP_REST_Request $request ): \WP_REST_Response {
		$to = (string) ( $this->settingsManager->get( 'email.delivery.to_email' ) ?: get_option( 'admin_email' ) );

		$siteName = get_bloginfo( 'name' );

		$subject = sprintf(
			/* translators: %s: site name */
			__( '[%s] Test email from AllFeedback', 'allfeedback' ),
			$siteName
		);

		$body = implode( "\n\n", [
			__( 'This is a test email sent from AllFeedback to verify your email delivery settings.', 'allfeedback' ),
			__( 'If you received this message, your configuration is working correctly.', 'allfeedback' ),
			/* translators: %s: site name */
			sprintf( __( 'Site: %s', 'allfeedback' ), esc_html( $siteName ) ),
		] );

		$sent = $this->mailer->send( $to, $subject, $body );

		if ( ! $sent ) {
			$this->logger->warning(
				'Test email delivery failed.',
				[ 'to' => $to, 'user_id' => get_current_user_id() ]
			);
		}

		return $this->successResponse( [ 'sent' => $sent ] );
	}

	/**
	 * JSON Schema for the settings resource (three-level nesting).
	 *
	 * Each page → type:object with properties for each section.
	 * Each section → type:object with properties for each field.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	public function getPublicItemSchema(): array {
		$pageProperties = [];

		foreach ( $this->settingsManager->getSchema() as $page => $pageDef ) {
			$sectionProperties = [];

			foreach ( $pageDef['sections'] as $section => $sectionDef ) {
				$fieldProperties = [];

				foreach ( $sectionDef['properties'] as $field => $propDef ) {
					$fieldProperties[ $field ] = array_merge(
						[ 'context' => [ 'view', 'edit' ] ],
						$propDef
					);
				}

				$sectionProperties[ $section ] = [
					'type'        => 'object',
					'context'     => [ 'view', 'edit' ],
					'description' => $sectionDef['description'] ?? '',
					'properties'  => $fieldProperties,
				];
			}

			$pageProperties[ $page ] = [
				'type'        => 'object',
				'context'     => [ 'view', 'edit' ],
				'description' => $pageDef['description'] ?? '',
				'properties'  => $sectionProperties,
			];
		}

		return [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'allfeedback_settings',
			'type'       => 'object',
			'properties' => $pageProperties,
		];
	}

	/**
	 * Build WP REST arg descriptors for PUT|PATCH /settings.
	 *
	 * Three-level nesting mirrors the schema:
	 *   page (type:object) → section (type:object) → field (typed arg)
	 *
	 * WordPress validates nested objects since WP 5.6.
	 * Adding a new page/section/field to SettingsManager::getSchema()
	 * automatically exposes it here — no manual registration needed.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function settingsArgs(): array {
		$schema = $this->settingsManager->getSchema();
		$args   = [];

		foreach ( $schema as $page => $pageDef ) {
			$sectionArgs = [];

			foreach ( $pageDef['sections'] as $section => $sectionDef ) {
				$fieldArgs = [];

				foreach ( $sectionDef['properties'] as $field => $propDef ) {
					$fieldArgs[ $field ] = $this->buildFieldArg( $propDef );
				}

				$sectionArgs[ $section ] = [
					'type'              => 'object',
					'required'          => false,
					'description'       => $sectionDef['description'] ?? '',
					'properties'        => $fieldArgs,
					'validate_callback' => 'rest_validate_request_arg',
				];
			}

			$args[ $page ] = [
				'type'              => 'object',
				'required'          => false,
				'description'       => $pageDef['description'] ?? '',
				'properties'        => $sectionArgs,
				'validate_callback' => 'rest_validate_request_arg',
			];
		}

		return $args;
	}

	/**
	 * Build a single WP REST field arg descriptor from a schema property entry.
	 *
	 * Mapping:
	 *   type: boolean          → rest_sanitize_boolean
	 *   type: integer          → absint + optional min/max
	 *   type: string + enum    → sanitize_key + enum list
	 *   type: string (no enum) → sanitize_text_field
	 *
	 * @param  array<string, mixed> $propDef Schema property definition.
	 * @return array<string, mixed> WP REST arg descriptor.
	 * @since  1.0.0
	 */
	private function buildFieldArg( array $propDef ): array {
		$type = $propDef['type'] ?? 'string';

		if ( $type === 'boolean' ) {
			return [
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
				'validate_callback' => 'rest_validate_request_arg',
			];
		}

		if ( $type === 'integer' ) {
			$arg = [
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'validate_callback' => 'rest_validate_request_arg',
			];
			if ( isset( $propDef['minimum'] ) ) {
				$arg['minimum'] = (int) $propDef['minimum'];
			}
			if ( isset( $propDef['maximum'] ) ) {
				$arg['maximum'] = (int) $propDef['maximum'];
			}
			return $arg;
		}

		if ( isset( $propDef['enum'] ) ) {
			return [
				'type'              => 'string',
				'enum'              => $propDef['enum'],
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => 'rest_validate_request_arg',
			];
		}

		return [
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'validate_callback' => 'rest_validate_request_arg',
		];
	}
}
