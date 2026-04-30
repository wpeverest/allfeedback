<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Mail\Notifications;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Core\Settings\SettingsManager;
use AllFeedback\Domain\Analytics\SurveySessionRepository;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyFilter;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Domain\Survey\SurveyStatus;
use AllFeedback\Infrastructure\Mail\Mailer;
use AllFeedback\Traits\Hooks;

/**
 * Composes and sends the weekly response-stats digest to the admin email address.
 *
 * The digest is site-wide (not per-survey) and summarises:
 *   - Total responses this week vs last week (with trend)
 *   - Average NPS score this week vs last week
 *   - Completion rate this week vs last week
 *   - Per-survey breakdown (top 5 published surveys by response count)
 *   - "View Analytics →" CTA button
 *
 * The email is sent every Monday at 08:00 (site timezone) via Action Scheduler.
 * No settings toggle is exposed — the digest is always on when admin notifications
 * are enabled.
 *
 * @package AllFeedback\Infrastructure\Mail\Notifications
 * @since   1.0.0
 */
class WeeklyDigestNotification {

	use Hooks;

	/**
	 * @param  Mailer                  $mailer            Mailer for dispatching the email.
	 * @param  SettingsManager         $settings          Plugin settings.
	 * @param  ResponseRepository      $responses         Response repository for stats queries.
	 * @param  SurveySessionRepository $sessions          Session repository for completion stats.
	 * @param  SurveyRepository        $surveys           Survey repository for published surveys.
	 * @since  1.0.0
	 */
	public function __construct(
		private readonly Mailer $mailer,
		private readonly SettingsManager $settings,
		private readonly ResponseRepository $responses,
		private readonly SurveySessionRepository $sessions,
		private readonly SurveyRepository $surveys,
	) {}

	/**
	 * Compose and send the weekly digest to the configured admin address.
	 *
	 * Silently returns false and skips sending when admin notifications are
	 * disabled in plugin settings.
	 *
	 * @return bool True when the email was dispatched successfully.
	 * @since  1.0.0
	 */
	public function send(): bool {
		if ( ! $this->settings->get( 'email.notifications.admin_enabled' ) ) {
			return false;
		}

		$to = (string) ( $this->settings->get( 'email.delivery.to_email' ) ?: get_option( 'admin_email' ) );

		$allPublishedSurveys = $this->surveys->findAll(
			new SurveyFilter( status: SurveyStatus::Published, perPage: PHP_INT_MAX, orderBy: 'response_count', order: 'DESC' )
		);

		$allPublishedIds  = array_map( fn( Survey $s ) => (int) $s->getId(), $allPublishedSurveys );
		$publishedSurveys = array_slice( $allPublishedSurveys, 0, 5 );

		$responseStats = $this->responses->getOverviewStatsForSurveys( $allPublishedIds );
		$sessionStats  = $this->sessions->getOverviewSessionStatsForSurveys( $allPublishedIds );

		$surveyIds   = array_map( fn( Survey $s ) => (int) $s->getId(), $publishedSurveys );
		$weeklyStats = $surveyIds ? $this->responses->getWeeklyStatsBySurveyIds( $surveyIds ) : [];

		$dateRange = date( 'M j', strtotime( '-6 days' ) ) . '–' . date( 'M j' );

		$subject = (string) $this->applyFilters(
			'allfeedback:mail:digest_subject',
			sprintf(
				/* translators: %s: date range e.g. "Apr 22–28" */
				__( 'Your weekly survey report | %s', 'allfeedback' ),
				$dateRange
			)
		);

		$body = $this->buildBody( $responseStats, $sessionStats, $publishedSurveys, $weeklyStats, $dateRange );
		$body = (string) $this->applyFilters( 'allfeedback:mail:digest_body', $body );

		return $this->mailer->send( $to, $subject, $body );
	}

	/**
	 * Build the HTML body for the weekly digest.
	 *
	 * @param  array<string, mixed>                                            $responseStats  From ResponseRepository::getOverviewStats().
	 * @param  array<string, mixed>                                            $sessionStats   From SurveySessionRepository::getOverviewSessionStats().
	 * @param  Survey[]                                                        $surveys        Up to 5 published surveys ordered by response count.
	 * @param  array<int, array{this_week_count: int, avg_score: float|null}>  $weeklyStats    Per-survey this-week stats keyed by survey ID.
	 * @param  string                                                          $dateRange      Human-readable date range string.
	 * @return string HTML body content (no newlines — safe for nl2br in Mailer).
	 * @since  1.0.0
	 */
	private function buildBody(
		array $responseStats,
		array $sessionStats,
		array $surveys,
		array $weeklyStats,
		string $dateRange
	): string {
		$thisWeek       = (int) ( $responseStats['this_week_count']      ?? 0 );
		$lastWeek       = (int) ( $responseStats['last_week_count']      ?? 0 );
		$thisAvgScore   = $responseStats['this_week_avg_score']          ?? null;
		$lastAvgScore   = $responseStats['last_week_avg_score']          ?? null;
		$thisCompletion = $sessionStats['this_week_completion_rate']     ?? null;
		$lastCompletion = $sessionStats['last_week_completion_rate']     ?? null;

		$analyticsUrl = esc_url( admin_url( 'admin.php' ) . '?page=allfeedback#/analytics' );

		// ── Date header ───────────────────────────────────────────────────────
		$html  = '<p style="margin:0 0 2px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">' . esc_html__( 'Weekly Report', 'allfeedback' ) . '</p>';
		$html .= '<p style="margin:0 0 28px 0;font-size:12px;color:#9ca3af;">' . esc_html( $dateRange ) . '</p>';

		// ── Hero: total responses + trend badge ───────────────────────────────
		$trend = $this->trendBadge( $thisWeek, $lastWeek );
		$html .= '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>';
		$html .= '<td style="vertical-align:middle;">';
		$html .= '<span style="display:block;font-size:40px;font-weight:700;color:#111827;line-height:1;">' . $thisWeek . '</span>';
		$html .= '<span style="display:block;margin-top:6px;font-size:13px;color:#6b7280;">' . esc_html__( 'responses this week', 'allfeedback' ) . '</span>';
		$html .= '</td>';
		if ( $trend !== '' ) {
			$html .= '<td style="vertical-align:middle;text-align:right;">' . $trend . '</td>';
		}
		$html .= '</tr></table>';

		// ── Site-wide stats rows ──────────────────────────────────────────────
		$html .= '<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;margin-bottom:28px;">';

		if ( $thisAvgScore !== null ) {
			$scoreTrend = $lastAvgScore !== null ? $this->scoreTrend( (float) $thisAvgScore, (float) $lastAvgScore ) : '';
			$html .= $this->statRow(
				esc_html__( 'Avg score this week', 'allfeedback' ),
				number_format( (float) $thisAvgScore, 1 ) . ' / 10',
				$scoreTrend,
				true
			);
		}

		if ( $thisCompletion !== null ) {
			$crTrend = $lastCompletion !== null ? $this->rateTrend( (float) $thisCompletion, (float) $lastCompletion ) : '';
			$html .= $this->statRow(
				esc_html__( 'Completion rate', 'allfeedback' ),
				number_format( (float) $thisCompletion, 0 ) . '%',
				$crTrend,
				false
			);
		}

		$html .= '</table>';

		// ── Per-survey breakdown ──────────────────────────────────────────────
		if ( ! empty( $surveys ) ) {
			$html .= '<p style="margin:0 0 12px 0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">' . esc_html__( 'Survey Breakdown', 'allfeedback' ) . '</p>';
			$html .= '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">';

			$lastSurvey = end( $surveys );
			foreach ( $surveys as $survey ) {
				$sid       = (int) $survey->getId();
				$weekCount = $weeklyStats[ $sid ]['this_week_count'] ?? 0;
				$avgScore  = $weeklyStats[ $sid ]['avg_score']       ?? null;
				$border    = $survey === $lastSurvey ? '' : 'border-bottom:1px solid #f3f4f6;';

				// Right cell: score + NPS pill when available, otherwise plain count
				if ( $avgScore !== null ) {
					$nps       = $this->npsLabel( $avgScore );
					$rightHtml = '<span style="font-weight:600;color:#111827;">' . number_format( $avgScore, 1 ) . ' / 10</span>'
						. '&nbsp;<span style="font-size:11px;padding:2px 8px;border-radius:99px;font-weight:600;background:' . $nps['bg'] . ';color:' . $nps['color'] . ';">' . esc_html( $nps['text'] ) . '</span>';
				} else {
					$rightHtml = '<span style="color:#6b7280;font-size:13px;">' . $weekCount . ' ' . esc_html__( 'this week', 'allfeedback' ) . '</span>';
				}

				$html .= '<tr>';
				$html .= '<td style="padding:10px 0;font-size:13px;color:#374151;' . $border . '">'
					. esc_html( $survey->getTitle() )
					. '<span style="margin-left:8px;font-size:12px;color:#9ca3af;">' . $weekCount . ' ' . esc_html__( 'responses', 'allfeedback' ) . '</span>'
					. '</td>';
				$html .= '<td style="padding:10px 0;font-size:13px;text-align:right;' . $border . '">' . $rightHtml . '</td>';
				$html .= '</tr>';
			}

			$html .= '</table>';
		}

		// ── CTA button ────────────────────────────────────────────────────────
		$html .= '<a href="' . $analyticsUrl . '" style="display:inline-block;padding:10px 24px;background:#6366f1;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">' . esc_html__( 'View Analytics →', 'allfeedback' ) . '</a>';

		return $html;
	}

	/** Pill badge showing % change vs last week. */
	private function trendBadge( int $thisWeek, int $lastWeek ): string {
		if ( $lastWeek === 0 ) {
			return '';
		}
		$pct = (int) round( ( $thisWeek - $lastWeek ) / $lastWeek * 100 );
		$up  = $pct >= 0;
		return sprintf(
			'<span style="display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;background:%s;color:%s;">%s%d%% %s</span>',
			$up ? '#dcfce7' : '#fee2e2',
			$up ? '#16a34a' : '#dc2626',
			$up ? '+' : '',
			$pct,
			esc_html__( 'vs last week', 'allfeedback' )
		);
	}

	/** Inline ↑/↓ indicator for a numeric score. */
	private function scoreTrend( float $now, float $prev ): string {
		$up = $now >= $prev;
		return sprintf(
			'<span style="font-size:11px;color:%s;">%s %.1f</span>',
			$up ? '#16a34a' : '#dc2626',
			$up ? '↑' : '↓',
			$prev
		);
	}

	/** Inline ↑/↓ indicator for a percentage rate. */
	private function rateTrend( float $now, float $prev ): string {
		$up = $now >= $prev;
		return sprintf(
			'<span style="font-size:11px;color:%s;">%s %.0f%%</span>',
			$up ? '#16a34a' : '#dc2626',
			$up ? '↑' : '↓',
			$prev
		);
	}

	/** Single two-column stat row. */
	private function statRow( string $label, string $value, string $trend, bool $hasBorder ): string {
		$border = $hasBorder ? 'border-bottom:1px solid #f3f4f6;' : '';
		return '<tr>'
			. '<td style="padding:11px 0;font-size:13px;color:#374151;' . $border . '">' . $label . '</td>'
			. '<td style="padding:11px 0;font-size:13px;font-weight:600;color:#111827;text-align:right;' . $border . '">'
			. $value . ( $trend !== '' ? ' ' . $trend : '' )
			. '</td></tr>';
	}

	/**
	 * Return NPS category label + pill colours for a given avg score.
	 *
	 * @return array{text: string, bg: string, color: string}
	 */
	private function npsLabel( float $score ): array {
		if ( $score >= 9 ) {
			return [ 'text' => __( 'Promoter', 'allfeedback' ),  'bg' => '#dcfce7', 'color' => '#16a34a' ];
		}
		if ( $score >= 7 ) {
			return [ 'text' => __( 'Passive', 'allfeedback' ),   'bg' => '#fef9c3', 'color' => '#ca8a04' ];
		}
		return     [ 'text' => __( 'Detractor', 'allfeedback' ), 'bg' => '#fee2e2', 'color' => '#dc2626' ];
	}
}
