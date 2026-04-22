<?php

declare(strict_types=1);

namespace AllFeedback\API\Controllers\V1;

use AllFeedback\API\RestController;
use AllFeedback\Core\Constants;
use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyRepository;
use WP_REST_Request;
use WP_REST_Response;

class WizardController extends RestController {

	protected string $restBase = 'wizard';

	private const OPTION_STATUS = 'allfeedback_wizard_status';
	private const OPTION_DATA   = '_allfb_wizard_data';

	public function __construct(
		private readonly SettingsManager $settingsManager,
		private readonly SurveyRepository $surveyRepository,
	) {}

	public function registerRoutes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->restBase,
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'getStatus' ],
					'permission_callback' => [ $this, 'adminPermission' ],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->restBase . '/complete',
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

	public function getStatus( WP_REST_Request $request ): WP_REST_Response {
		return $this->successResponse( [
			'status' => get_option( self::OPTION_STATUS, 'not_started' ),
		] );
	}

	public function complete( WP_REST_Request $request ): WP_REST_Response|\WP_Error {
		$brandColor = $request->get_param( 'brand_color' );
		$position   = $request->get_param( 'position' );

		$widget = (array) $this->settingsManager->get( 'general.widget' );
		$this->settingsManager->setSection( 'general', 'widget', array_merge( $widget, [
			'color'    => $brandColor ?: $widget['color'],
			'position' => $position ?: $widget['position'],
		] ) );

		update_option(
			self::OPTION_DATA,
			[
				'template'        => $request->get_param( 'template' ),
				'admin_email'     => $request->get_param( 'admin_email' ),
				'notif_frequency' => $request->get_param( 'notif_frequency' ),
				'consent'         => $request->get_param( 'consent' ),
				'anonymize_ip'    => $request->get_param( 'anonymize_ip' ),
				'retention'       => $request->get_param( 'retention' ),
			],
			false
		);

		update_option( self::OPTION_STATUS, 'completed', false );

		$templateId = $request->get_param( 'template' );
		$schema     = [];
		$path       = Constants::path( "resources/scripts/admin/data/templates/{$templateId}.json" );

		if ( file_exists( $path ) ) {
			$schema = json_decode( (string) file_get_contents( $path ), true ) ?: [];
		}

		$survey = new Survey(
			title:      __( 'My First Feedback Form', 'all-feedback' ),
			formSchema: $schema,
			styling:    [
				'brand_color' => $brandColor ?: '#6366F1',
			],
			settings:   [
				'widget' => [
					'enabled'  => true,
					'position' => $position ?: 'bottom-right',
				],
			],
			createdBy:  get_current_user_id() ?: 0,
		);

		$formId = null;
		try {
			$survey = $this->surveyRepository->save( $survey );
			$formId = $survey->getId();
		} catch ( \Exception $e ) {
			// Fail silently
		}

		return $this->successResponse( [ 
			'status' => 'completed',
			'id'     => $formId,
		] );
	}

	private function completeArgs(): array {
		return [
			'template'        => $this->argEnum(
				description: 'Survey template',
				values:      [ 'nps', 'general-feedback', 'bug-report', 'feature-request', 'product-feedback', 'customer-research' ],
				default:     'nps'
			),
			'brand_color'     => $this->argString(
				description: 'Brand color hex value',
				sanitize:    'sanitize_hex_color',
				default:     '#6366F1'
			),
			'position'        => $this->argEnum(
				description: 'Widget position on page',
				values:      [ 'bottom-right', 'bottom-left', 'side-tab' ],
				default:     'bottom-right'
			),
			'admin_email'     => $this->argString(
				description: 'Admin notification email address',
				sanitize:    'sanitize_email'
			),
			'notif_frequency' => $this->argEnum(
				description: 'Email notification frequency',
				values:      [ 'instant', 'daily', 'weekly' ],
				default:     'instant'
			),
			'consent'         => $this->argBoolean(
				description: 'Show consent notice to visitors',
				default:     true
			),
			'anonymize_ip'    => $this->argBoolean(
				description: 'Anonymize respondent IP addresses',
				default:     true
			),
			'retention'       => $this->argEnum(
				description: 'Response data retention period',
				values:      [ 'forever', '24m', '12m', '6m', '3m' ],
				default:     '12m'
			),
		];
	}
}
