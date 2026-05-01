<?php
/**
 * Survey session.
 *
 * @package AllFeedback\Domain\Analytics
 * @since   1.0.0
 */

declare(strict_types=1);

namespace AllFeedback\Domain\Analytics;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Shared\Entity;
use DateTimeImmutable;

/**
 * Aggregate root representing one user's interaction session with a survey.
 *
 * Timestamps are the authoritative source of truth; `status` is a derived
 * materialised value kept for indexed queries.
 *
 * @package AllFeedback\Domain\Analytics
 * @since   1.0.0
 */
class SurveySession extends Entity {

	/**
	 * Timestamp of the most recent activity in this session.
	 *
	 * @var DateTimeImmutable
	 * @since 1.0.0
	 */
	private DateTimeImmutable $last_active_at;

	/**
	 * Timestamp of when the session record was first created.
	 *
	 * @var DateTimeImmutable
	 * @since 1.0.0
	 */
	private DateTimeImmutable $created_at;

	/**
	 * Constructor.
	 *
	 * @param  int                    $survey_id     Parent survey primary key.
	 * @param  string                 $session_id    Client-generated session UUID.
	 * @param  int|null               $user_id       WordPress user ID, or null for guests.
	 * @param  string|null            $guest_id      Persistent guest token, or null.
	 * @param  string                 $status       Materialised status: viewed | started | submitted | abandoned.
	 * @param  DateTimeImmutable|null $started_at    When the first field interaction occurred.
	 * @param  DateTimeImmutable|null $submitted_at  When a completed submission was recorded.
	 * @param  DateTimeImmutable|null $abandoned_at  When the session was abandoned.
	 * @param  DateTimeImmutable|null $last_active_at Last-activity timestamp; defaults to now.
	 * @param  DateTimeImmutable|null $created_at    Creation timestamp; defaults to now.
	 * @since  1.0.0
	 */
	public function __construct(
		private int $survey_id,
		private string $session_id,
		private ?int $user_id,
		private ?string $guest_id,
		private string $status = 'viewed',
		private ?DateTimeImmutable $started_at = null,
		private ?DateTimeImmutable $submitted_at = null,
		private ?DateTimeImmutable $abandoned_at = null,
		?DateTimeImmutable $last_active_at = null,
		?DateTimeImmutable $created_at = null,
	) {
		$now                  = new DateTimeImmutable();
		$this->last_active_at = $last_active_at ?? $now;
		$this->created_at     = $created_at ?? $now;
	}

	/**
	 * Return the parent survey ID.
	 *
	 * @return int
	 * @since  1.0.0
	 */
	public function getSurveyId(): int {
		return $this->survey_id; }

	/**
	 * Return the client-generated session UUID.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getSessionId(): string {
		return $this->session_id; }

	/**
	 * Return the WordPress user ID, or null for guests.
	 *
	 * @return int|null
	 * @since  1.0.0
	 */
	public function getUserId(): ?int {
		return $this->user_id; }

	/**
	 * Return the persistent guest token, or null when absent.
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getGuestId(): ?string {
		return $this->guest_id; }

	/**
	 * Return the materialised session status string.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getStatus(): string {
		return $this->status; }

	/**
	 * Return the timestamp of the first field interaction, or null.
	 *
	 * @return DateTimeImmutable|null
	 * @since  1.0.0
	 */
	public function getStartedAt(): ?DateTimeImmutable {
		return $this->started_at; }

	/**
	 * Return the timestamp of a completed submission, or null.
	 *
	 * @return DateTimeImmutable|null
	 * @since  1.0.0
	 */
	public function getSubmittedAt(): ?DateTimeImmutable {
		return $this->submitted_at; }

	/**
	 * Return the timestamp when the session was abandoned, or null.
	 *
	 * @return DateTimeImmutable|null
	 * @since  1.0.0
	 */
	public function getAbandonedAt(): ?DateTimeImmutable {
		return $this->abandoned_at; }

	/**
	 * Return the last-active timestamp.
	 *
	 * @return DateTimeImmutable
	 * @since  1.0.0
	 */
	public function getLastActiveAt(): DateTimeImmutable {
		return $this->last_active_at; }

	/**
	 * Return the session creation timestamp.
	 *
	 * @return DateTimeImmutable
	 * @since  1.0.0
	 */
	public function getCreatedAt(): DateTimeImmutable {
		return $this->created_at; }

	/**
	 * Return true when a submission timestamp has been recorded.
	 *
	 * @return bool
	 * @since  1.0.0
	 */
	public function isSubmitted(): bool {
		return $this->submitted_at !== null;
	}

	/**
	 * Assign the persistence ID after the first INSERT.
	 *
	 * Called only by the repository layer.
	 *
	 * @param  int $id The primary key assigned by the database.
	 * @return void
	 * @since  1.0.0
	 */
	public function assignId( int $id ): void {
		$this->id = $id;
	}

	/**
	 * Record that the user interacted with the first field.
	 *
	 * No-op if the session was already started.
	 *
	 * @param  DateTimeImmutable $at Timestamp of the first field interaction.
	 * @return void
	 * @since  1.0.0
	 */
	public function markStarted( DateTimeImmutable $at ): void {
		if ( $this->started_at !== null ) {
			return;
		}
		$this->started_at     = $at;
		$this->last_active_at = $at;
		$this->status         = 'started';
	}

	/**
	 * Record a completed submission.
	 *
	 * No-op if the session was already submitted.
	 *
	 * @param  DateTimeImmutable $at Timestamp of the submission.
	 * @return void
	 * @since  1.0.0
	 */
	public function markSubmitted( DateTimeImmutable $at ): void {
		if ( $this->submitted_at !== null ) {
			return;
		}
		$this->submitted_at   = $at;
		$this->last_active_at = $at;
		$this->status         = 'submitted';
	}

	/**
	 * Record that the user closed the widget without submitting.
	 *
	 * No-op if the session has already been submitted.
	 *
	 * @param  DateTimeImmutable $at Timestamp of the abandonment.
	 * @return void
	 * @since  1.0.0
	 */
	public function markAbandoned( DateTimeImmutable $at ): void {
		if ( $this->submitted_at !== null ) {
			return;
		}
		$this->abandoned_at   = $at;
		$this->last_active_at = $at;
		$this->status         = 'abandoned';
	}

	/**
	 * Update last_active_at to the given timestamp (heartbeat).
	 *
	 * @param  DateTimeImmutable $at Current timestamp.
	 * @return void
	 * @since  1.0.0
	 */
	public function touchActive( DateTimeImmutable $at ): void {
		$this->last_active_at = $at;
	}

	/**
	 * Rehydrate a SurveySession aggregate from a raw DB row.
	 *
	 * @param  array<string, mixed> $row Raw database row.
	 * @return self
	 * @since  1.0.0
	 */
	public static function reconstitute( array $row ): self {
		$to_date = static function ( ?string $v ): ?DateTimeImmutable {
			if ( $v === null ) {
				return null;
			}
			$dt = DateTimeImmutable::createFromFormat( 'Y-m-d H:i:s', $v );
			return $dt !== false ? $dt : null;
		};

		$session = new self(
			survey_id:     (int) $row['survey_id'],
			session_id:    (string) $row['session_id'],
			user_id:       isset( $row['user_id'] ) && $row['user_id'] !== null ? (int) $row['user_id'] : null,
			guest_id:      $row['guest_id'] !== null ? (string) $row['guest_id'] : null,
			status:       (string) $row['status'],
			started_at:    $to_date( $row['started_at'] ?? null ),
			submitted_at:  $to_date( $row['submitted_at'] ?? null ),
			abandoned_at:  $to_date( $row['abandoned_at'] ?? null ),
			last_active_at: $to_date( $row['last_active_at'] ) ?? new DateTimeImmutable(),
			created_at:    $to_date( $row['created_at'] ) ?? new DateTimeImmutable(),
		);

		$session->id = (int) $row['id'];

		return $session;
	}
}
