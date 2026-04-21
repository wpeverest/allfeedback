<?php

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
 * @since 1.0.0
 */
class SurveySession extends Entity {

	private DateTimeImmutable $lastActiveAt;
	private DateTimeImmutable $createdAt;

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private int $surveyId,
		private string $sessionId,
		private ?int $userId,
		private ?string $guestId,
		private string $status = 'viewed',
		private ?DateTimeImmutable $startedAt = null,
		private ?DateTimeImmutable $submittedAt = null,
		private ?DateTimeImmutable $abandonedAt = null,
		?DateTimeImmutable $lastActiveAt = null,
		?DateTimeImmutable $createdAt = null,
	) {
		$now                = new DateTimeImmutable();
		$this->lastActiveAt = $lastActiveAt ?? $now;
		$this->createdAt    = $createdAt    ?? $now;
	}

	// ------------------------------------------------------------------
	// Getters
	// ------------------------------------------------------------------

	public function getSurveyId(): int { return $this->surveyId; }
	public function getSessionId(): string { return $this->sessionId; }
	public function getUserId(): ?int { return $this->userId; }
	public function getGuestId(): ?string { return $this->guestId; }
	public function getStatus(): string { return $this->status; }
	public function getStartedAt(): ?DateTimeImmutable { return $this->startedAt; }
	public function getSubmittedAt(): ?DateTimeImmutable { return $this->submittedAt; }
	public function getAbandonedAt(): ?DateTimeImmutable { return $this->abandonedAt; }
	public function getLastActiveAt(): DateTimeImmutable { return $this->lastActiveAt; }
	public function getCreatedAt(): DateTimeImmutable { return $this->createdAt; }

	public function isSubmitted(): bool {
		return $this->submittedAt !== null;
	}

	/**
	 * Assign the persistence ID after the first INSERT.
	 * Called only by the repository layer.
	 *
	 * @since 1.0.0
	 */
	public function assignId( int $id ): void {
		$this->id = $id;
	}

	// ------------------------------------------------------------------
	// State transitions (all idempotent)
	// ------------------------------------------------------------------

	/**
	 * Record that the user interacted with the first field.
	 * No-op if already started.
	 *
	 * @since 1.0.0
	 */
	public function markStarted( DateTimeImmutable $at ): void {
		if ( $this->startedAt !== null ) {
			return;
		}
		$this->startedAt    = $at;
		$this->lastActiveAt = $at;
		$this->status       = 'started';
	}

	/**
	 * Record a completed submission.
	 * No-op if already submitted.
	 *
	 * @since 1.0.0
	 */
	public function markSubmitted( DateTimeImmutable $at ): void {
		if ( $this->submittedAt !== null ) {
			return;
		}
		$this->submittedAt  = $at;
		$this->lastActiveAt = $at;
		$this->status       = 'submitted';
	}

	/**
	 * Record that the user closed the widget without submitting.
	 * No-op if already submitted.
	 *
	 * @since 1.0.0
	 */
	public function markAbandoned( DateTimeImmutable $at ): void {
		if ( $this->submittedAt !== null ) {
			return;
		}
		$this->abandonedAt  = $at;
		$this->lastActiveAt = $at;
		$this->status       = 'abandoned';
	}

	/**
	 * Update last_active_at to now (heartbeat).
	 *
	 * @since 1.0.0
	 */
	public function touchActive( DateTimeImmutable $at ): void {
		$this->lastActiveAt = $at;
	}

	// ------------------------------------------------------------------
	// Reconstitution
	// ------------------------------------------------------------------

	/**
	 * Rehydrate a SurveySession aggregate from a raw DB row.
	 *
	 * @param array<string, mixed> $row
	 * @since 1.0.0
	 */
	public static function reconstitute( array $row ): self {
		$toDate = static fn( ?string $v ): ?DateTimeImmutable =>
			$v !== null ? DateTimeImmutable::createFromFormat( 'Y-m-d H:i:s', $v ) ?: null : null;

		$session = new self(
			surveyId:     (int) $row['survey_id'],
			sessionId:    (string) $row['session_id'],
			userId:       isset( $row['user_id'] ) && $row['user_id'] !== null ? (int) $row['user_id'] : null,
			guestId:      $row['guest_id'] !== null ? (string) $row['guest_id'] : null,
			status:       (string) $row['status'],
			startedAt:    $toDate( $row['started_at'] ?? null ),
			submittedAt:  $toDate( $row['submitted_at'] ?? null ),
			abandonedAt:  $toDate( $row['abandoned_at'] ?? null ),
			lastActiveAt: $toDate( $row['last_active_at'] ) ?? new DateTimeImmutable(),
			createdAt:    $toDate( $row['created_at'] ) ?? new DateTimeImmutable(),
		);

		$session->id = (int) $row['id'];

		return $session;
	}
}
