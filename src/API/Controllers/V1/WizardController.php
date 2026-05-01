<?php
/**
 * Wizard controller.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

defined( 'ABSPATH' ) || exit;

use AllFeedback\API\RestController;
use AllFeedback\Core\Constants;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Support\Logger;

/**
 * REST controller for the one-time Setup Wizard flow.
 *
 * Raw wizard submission data is persisted to `_allfb_wizard_data` so that
 * pro add-ons can act on it after the fact via the `allfeedback_wizard_completed`
 * action hook.
 *
 * @package AllFeedback\API\Controllers\V1
 * @since   1.0.0
 */
class WizardController extends RestController {

	/**
	 * REST resource slug.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	protected string $rest_base = 'wizard';

	/**
	 * Option key that tracks the wizard lifecycle state.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const OPTION_STATUS = 'allfeedback_wizard_status';

	/**
	 * Option key that persists the raw wizard submission for audit / pro add-ons.
	 *
	 * @var string
	 * @since 1.0.0
	 */
	private const OPTION_DATA = '_allfb_wizard_data';

	/**
	 * Constructor.
	 *
	 * @param  SettingsManager  $settings_manager  Plugin-wide settings store.
	 * @param  SurveyRepository $survey_repository Survey persistence layer.
	 * @param  Logger           $logger           Structured event logger.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly SettingsManager $settings_manager,
		private readonly SurveyRepository $survey_repository,
		private readonly Logger $logger,
	) {}

	/**
	 * Register all REST routes for this controller.
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
					'callback'            => [ $this, 'getStatus' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => [],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/complete',
			[
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'complete' ],
					'permission_callback' => [ $this, 'adminPermission' ],
					'args'                => $this->completeArgs(),
				],
			]
		);
	}

	/**
	 * Handle `GET /wizard`.
	 *
	 * Returns the current wizard lifecycle status. The response shape can be
	 * extended by pro add-ons via the `allfeedback_wizard_status_response` filter.
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response
	 * @since  1.0.0
	 */
	public function getStatus( \WP_REST_Request $request ): \WP_REST_Response {
		$status = (string) get_option( self::OPTION_STATUS, 'not_started' );

		/**
		 * Filter the GET /wizard response payload.
		 *
		 * @param array<string, mixed> $response Response data before it is sent.
		 * @since 1.0.0
		 */
		$response = (array) apply_filters( 'allfeedback_wizard_status_response', [ 'status' => $status ] );

		return $this->successResponse( $response );
	}

	/**
	 * Handle `POST /wizard/complete`.
	 *
	 * Persists widget appearance settings, saves the raw submission for the audit
	 * trail, creates the first survey from the chosen template, and marks the
	 * wizard as completed.
	 *
	 * Fires `allfeedback_wizard_before_complete` before processing so pro add-ons
	 * can modify or validate the wizard data, and `allfeedback_wizard_completed`
	 * after the survey is created so add-ons can apply remaining settings
	 * (notification email, consent, IP anonymisation, retention policy).
	 *
	 * @param  \WP_REST_Request $request Full request data.
	 * @return \WP_REST_Response|\WP_Error
	 * @since  1.0.0
	 */
	public function complete( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$brand_color_raw = sanitize_hex_color( (string) ( $request->get_param( 'brand_color' ) ?? '' ) );
		$brand_color     = $brand_color_raw !== null && $brand_color_raw !== '' ? $brand_color_raw : null;
		$position        = sanitize_key( (string) ( $request->get_param( 'position' ) ?? '' ) );
		$template_id     = sanitize_key( (string) ( $request->get_param( 'template' ) ?? 'nps' ) );
		$admin_email     = sanitize_email( (string) ( $request->get_param( 'admin_email' ) ?? '' ) );

		// Apply widget appearance settings immediately.
		$widget = (array) $this->settings_manager->get( 'general.widget' );
		$this->settings_manager->setSection(
			'general',
			'widget',
			array_merge(
				$widget,
				[
					'color'    => $brand_color !== null ? $brand_color : $widget['color'],
					'position' => $position !== '' ? $position : $widget['position'],
				]
			)
		);

		// Build and persist the sanitised wizard data payload.
		$wizard_data = [
			'template'        => $template_id,
			'admin_email'     => $admin_email,
			'notif_frequency' => sanitize_key( (string) ( $request->get_param( 'notif_frequency' ) ?? 'instant' ) ),
			'consent'         => (bool) $request->get_param( 'consent' ),
			'anonymize_ip'    => (bool) $request->get_param( 'anonymize_ip' ),
			'retention'       => sanitize_key( (string) ( $request->get_param( 'retention' ) ?? '12m' ) ),
		];

		update_option( self::OPTION_DATA, $wizard_data, false );
		update_option( self::OPTION_STATUS, 'completed', false );

		/**
		 * Fires before wizard completion is finalised.
		 *
		 * @param array<string, mixed> $wizard_data Sanitised wizard submission.
		 * @since 1.0.0
		 */
		do_action( 'allfeedback_wizard_before_complete', $wizard_data );

		// Create the first survey from the chosen template.
		$form_schema = $this->loadTemplate( $template_id );

		$template_titles = [
			'nps'               => 'NPS Survey',
			'general-feedback'  => 'General Feedback',
			'bug-report'        => 'Bug Report',
			'feature-request'   => 'Feature Request',
			'product-feedback'  => 'Product Feedback',
			'customer-research' => 'Customer Research',
		];

		/**
		 * Filter the default title of the first survey created by the wizard.
		 *
		 * @param string $title      Default survey title derived from the chosen template.
		 * @param string $template_id The template identifier chosen in the wizard.
		 * @since 1.0.0
		 */
		$survey_title = (string) apply_filters(
			'allfeedback_wizard_default_survey_title',
			$template_titles[ $template_id ] ?? 'Untitled',
			$template_id
		);

		$survey = new Survey(
			title:      $survey_title,
			form_schema: $form_schema,
			styling:    [
				'brand_color' => $brand_color !== null ? $brand_color : '#6366F1',
			],
			settings:   [
				'widget' => [
					'enabled'  => true,
					'position' => $position !== '' ? $position : 'bottom-right',
				],
			],
			created_by:  get_current_user_id(),
		);

		$form_id = null;

		try {
			$survey  = $this->survey_repository->save( $survey );
			$form_id = $survey->getId();
		} catch ( \Exception $e ) {
			$this->logger->error(
				'Wizard: failed to create first survey.',
				[
					'error' => $e->getMessage(),
					'template' => $template_id,
				]
			);
		}

		$this->logger->info(
			'Setup wizard completed.',
			[
				'template' => $template_id,
				'form_id'  => $form_id,
				'user_id'  => get_current_user_id(),
			]
		);

		/**
		 * Fires after the wizard is completed and the first survey is created.
		 *
		 * @param array<string, mixed> $wizard_data Sanitised wizard submission.
		 * @param int|null             $form_id     ID of the newly created survey, or null on failure.
		 * @since 1.0.0
		 */
		do_action( 'allfeedback_wizard_completed', $wizard_data, $form_id );

		return $this->successResponse(
			[
				'status' => 'completed',
				'id'     => $form_id,
			]
		);
	}

	/**
	 * Load a survey template JSON schema from the bundled data directory.
	 *
	 * @param  string $template_id Template identifier (e.g. "nps", "bug-report").
	 * @return array<mixed> Decoded JSON schema, or an empty array when not found.
	 * @since  1.0.0
	 */
	private function loadTemplate( string $template_id ): array {
		static $cache = [];

		if ( isset( $cache[ $template_id ] ) ) {
			return $cache[ $template_id ];
		}

		$path   = Constants::path( "resources/scripts/admin/data/templates/{$template_id}.json" );
		$schema = [];

		if ( file_exists( $path ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$schema_decoded = json_decode( (string) file_get_contents( $path ), true );
			$schema         = $schema_decoded !== null && $schema_decoded !== false ? $schema_decoded : [];
		}

		$cache[ $template_id ] = $schema;

		return $schema;
	}

	/**
	 * Build the argument schema for the `POST /wizard/complete` endpoint.
	 *
	 * @return array<string, array<string, mixed>>
	 * @since  1.0.0
	 */
	private function completeArgs(): array {
		/**
		 * Filter the list of survey templates available in the wizard.
		 *
		 * @param string[] $templates Allowed template IDs.
		 * @since 1.0.0
		 */
		$allowed_templates = (array) apply_filters(
			'allfeedback_wizard_templates',
			[ 'nps', 'general-feedback', 'bug-report', 'feature-request', 'product-feedback', 'customer-research' ]
		);

		return [
			'template'        => $this->argEnum(
				description: __( 'Survey template to use for the first form.', 'allfeedback' ),
				values:      $allowed_templates,
				default:     'nps',
			),
			'brand_color'     => $this->argString(
				description: __( 'Brand accent colour (hex, e.g. #6366F1).', 'allfeedback' ),
				sanitize:    'sanitize_hex_color',
				default:     '#6366F1',
			),
			'position'        => $this->argEnum(
				description: __( 'Widget position on the page.', 'allfeedback' ),
				values:      [ 'bottom-right', 'bottom-left', 'side-tab' ],
				default:     'bottom-right',
			),
			'admin_email'     => $this->argString(
				description: __( 'Email address for admin notifications.', 'allfeedback' ),
				sanitize:    'sanitize_email',
			),
			'notif_frequency' => $this->argEnum(
				description: __( 'How often to receive email notification digests.', 'allfeedback' ),
				values:      [ 'instant', 'daily', 'weekly' ],
				default:     'instant',
			),
			'consent'         => $this->argBoolean(
				description: __( 'Show a consent notice to visitors before recording responses.', 'allfeedback' ),
				default:     true,
			),
			'anonymize_ip'    => $this->argBoolean(
				description: __( 'Anonymise respondent IP addresses before storage.', 'allfeedback' ),
				default:     true,
			),
			'retention'       => $this->argEnum(
				description: __( 'How long to retain response data before automatic purging.', 'allfeedback' ),
				values:      [ 'forever', '24m', '12m', '6m', '3m' ],
				default:     '12m',
			),
		];
	}
}
