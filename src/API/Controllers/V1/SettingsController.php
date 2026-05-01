<?php
/**
 * Settings controller.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */

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
	 * @var string
	 * @since 1.0.0
	 */
	protected string $rest_base = 'settings';

	/**
	 * Constructor.
	 *
	 * @param  SettingsManager $settings_manager Plugin-wide settings store.
	 * @param  Mailer          $mailer          Email dispatcher for the test-email endpoint.
	 * @param  Logger          $logger          Structured logger.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SettingsManager $settings_manager,
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
			'/' . $this->rest_base,
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
			'/' . $this->rest_base . '/test-email',
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
		return $this->successResponse( $this->settings_manager->all() );
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

		$this->settings_manager->setMultiple( $body );

		$this->logger->info(
			'Plugin settings updated.',
			[
				'pages'   => array_keys( array_filter( $body, 'is_array' ) ),
				'user_id' => get_current_user_id(),
			]
		);

		return $this->successResponse( $this->settings_manager->all() );
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
		$to_email_setting = $this->settings_manager->get( 'email.delivery.to_email' );
		$to               = (string) ( $to_email_setting !== null && $to_email_setting !== '' ? $to_email_setting : get_option( 'admin_email' ) );

		$site_name = get_bloginfo( 'name' );

		$subject = sprintf(
			/* translators: %s: site name */
			__( '[%s] Test email from AllFeedback', 'allfeedback' ),
			$site_name
		);

		$body = implode(
			"\n\n",
			[
				__( 'This is a test email sent from AllFeedback to verify your email delivery settings.', 'allfeedback' ),
				__( 'If you received this message, your configuration is working correctly.', 'allfeedback' ),
				/* translators: %s: site name */
				sprintf( __( 'Site: %s', 'allfeedback' ), esc_html( $site_name ) ),
			]
		);

		$sent = $this->mailer->send( $to, $subject, $body );

		if ( ! $sent ) {
			$this->logger->warning(
				'Test email delivery failed.',
				[
					'to' => $to,
					'user_id' => get_current_user_id(),
				]
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
		$page_properties = [];

		foreach ( $this->settings_manager->getSchema() as $page => $page_def ) {
			$section_properties = [];

			foreach ( $page_def['sections'] as $section => $section_def ) {
				$field_properties = [];

				foreach ( $section_def['properties'] as $field => $prop_def ) {
					$field_properties[ $field ] = array_merge(
						[ 'context' => [ 'view', 'edit' ] ],
						$prop_def
					);
				}

				$section_properties[ $section ] = [
					'type'        => 'object',
					'context'     => [ 'view', 'edit' ],
					'description' => $section_def['description'] ?? '',
					'properties'  => $field_properties,
				];
			}

			$page_properties[ $page ] = [
				'type'        => 'object',
				'context'     => [ 'view', 'edit' ],
				'description' => $page_def['description'] ?? '',
				'properties'  => $section_properties,
			];
		}

		return [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'allfeedback_settings',
			'type'       => 'object',
			'properties' => $page_properties,
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
		$schema = $this->settings_manager->getSchema();
		$args   = [];

		foreach ( $schema as $page => $page_def ) {
			$section_args = [];

			foreach ( $page_def['sections'] as $section => $section_def ) {
				$field_args = [];

				foreach ( $section_def['properties'] as $field => $prop_def ) {
					$field_args[ $field ] = $this->buildFieldArg( $prop_def );
				}

				$section_args[ $section ] = [
					'type'              => 'object',
					'required'          => false,
					'description'       => $section_def['description'] ?? '',
					'properties'        => $field_args,
					'validate_callback' => 'rest_validate_request_arg',
				];
			}

			$args[ $page ] = [
				'type'              => 'object',
				'required'          => false,
				'description'       => $page_def['description'] ?? '',
				'properties'        => $section_args,
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
	 * @param  array<string, mixed> $prop_def Schema property definition.
	 * @return array<string, mixed> WP REST arg descriptor.
	 * @since  1.0.0
	 */
	private function buildFieldArg( array $prop_def ): array {
		$type = $prop_def['type'] ?? 'string';

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
			if ( isset( $prop_def['minimum'] ) ) {
				$arg['minimum'] = (int) $prop_def['minimum'];
			}
			if ( isset( $prop_def['maximum'] ) ) {
				$arg['maximum'] = (int) $prop_def['maximum'];
			}
			return $arg;
		}

		if ( isset( $prop_def['enum'] ) ) {
			return [
				'type'              => 'string',
				'enum'              => $prop_def['enum'],
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
