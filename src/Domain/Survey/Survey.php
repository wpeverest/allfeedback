<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Survey;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Shared\Entity;
use DateTimeImmutable;

/**
 * Survey aggregate root.
 *
 * Represents a single NPS survey definition including its form
 * schema, display settings, targeting rules, lifecycle status, and aggregate
 * response count.
 *
 * @package AllFeedback\Domain\Survey
 * @since   1.0.0
 */
class Survey extends Entity {

	/**
	 * Current lifecycle status of the survey.
	 *
	 * @var SurveyStatus
	 * @since 1.0.0
	 */
	private SurveyStatus $status;

	/**
	 * Human-readable explanation of a targeting conflict, or null when none.
	 *
	 * @var string|null
	 * @since 1.0.0
	 */
	private ?string $conflictReason = null;

	/**
	 * Denormalised count of submitted responses for this survey.
	 *
	 * @var int
	 * @since 1.0.0
	 */
	private int $responseCount;

	/**
	 * Timestamp of when the survey was first persisted.
	 *
	 * @var DateTimeImmutable
	 * @since 1.0.0
	 */
	private DateTimeImmutable $createdAt;

	/**
	 * Timestamp of the most recent update, or null when unmodified since creation.
	 *
	 * @var DateTimeImmutable|null
	 * @since 1.0.0
	 */
	private ?DateTimeImmutable $updatedAt = null;

	/**
	 * @param  string            $title         Human-readable survey title.
	 * @param  string            $description   Optional survey description.
	 * @param  array<mixed>      $formSchema    Structured form field definitions.
	 * @param  array<mixed>      $settings      Survey display and behaviour settings.
	 * @param  array<mixed>      $styling       Visual customisation overrides.
	 * @param  int               $createdBy     WordPress user ID of the author.
	 * @param  SurveyStatus|null $status        Initial status; defaults to Draft.
	 * @param  int               $responseCount Seed value for the response counter.
	 * @since  1.0.0
	 */
	public function __construct(
		private string $title,
		private string $description = '',
		private array $formSchema = [],
		private array $settings = [],
		private array $styling = [],
		private int $createdBy = 0,
		?SurveyStatus $status = null,
		int $responseCount = 0,
	) {
		$this->status        = $status ?? SurveyStatus::Draft;
		$this->responseCount = $responseCount;
		$this->createdAt     = new DateTimeImmutable();
	}

	/**
	 * Reconstitute a Survey from a persistence row.
	 *
	 * @param  int                    $id             Primary key.
	 * @param  string                 $title          Survey title.
	 * @param  string                 $description    Survey description.
	 * @param  array<mixed>           $formSchema     Decoded form schema.
	 * @param  array<mixed>           $settings       Decoded settings.
	 * @param  SurveyStatus           $status         Current status.
	 * @param  int                    $responseCount  Denormalised response count.
	 * @param  int                    $createdBy      Author user ID.
	 * @param  DateTimeImmutable      $createdAt      Creation timestamp.
	 * @param  DateTimeImmutable|null $updatedAt      Last-updated timestamp.
	 * @param  array<mixed>           $styling        Styling overrides.
	 * @param  string|null            $conflictReason Targeting conflict explanation.
	 * @return self
	 * @since  1.0.0
	 */
	public static function reconstitute(
		int $id,
		string $title,
		string $description,
		array $formSchema,
		array $settings,
		SurveyStatus $status,
		int $responseCount,
		int $createdBy,
		DateTimeImmutable $createdAt,
		?DateTimeImmutable $updatedAt = null,
		array $styling = [],
		?string $conflictReason = null,
	): self {
		$survey                 = new self( $title, $description, $formSchema, $settings, $styling, $createdBy, $status, $responseCount );
		$survey->id             = $id;
		$survey->createdAt      = $createdAt;
		$survey->updatedAt      = $updatedAt;
		$survey->conflictReason = $conflictReason;
		return $survey;
	}

	/**
	 * Return the survey title.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getTitle(): string {
		return $this->title;
	}

	/**
	 * Update the survey title and record a modification timestamp.
	 *
	 * @param  string $title New title.
	 * @return void
	 * @since  1.0.0
	 */
	public function setTitle( string $title ): void {
		$this->title = $title;
		$this->touch();
	}

	/**
	 * Return the survey description.
	 *
	 * @return string
	 * @since  1.0.0
	 */
	public function getDescription(): string {
		return $this->description;
	}

	/**
	 * Update the survey description and record a modification timestamp.
	 *
	 * @param  string $description New description.
	 * @return void
	 * @since  1.0.0
	 */
	public function setDescription( string $description ): void {
		$this->description = $description;
		$this->touch();
	}

	/**
	 * Return the raw form schema array.
	 *
	 * @return array<mixed>
	 * @since  1.0.0
	 */
	public function getFormSchema(): array {
		return $this->formSchema;
	}

	/**
	 * Replace the form schema and record a modification timestamp.
	 *
	 * @param  array<mixed> $formSchema New form schema.
	 * @return void
	 * @since  1.0.0
	 */
	public function setFormSchema( array $formSchema ): void {
		$this->formSchema = $formSchema;
		$this->touch();
	}

	/**
	 * Return the display and behaviour settings array.
	 *
	 * @return array<mixed>
	 * @since  1.0.0
	 */
	public function getSettings(): array {
		return $this->settings;
	}

	/**
	 * Replace the settings array and record a modification timestamp.
	 *
	 * @param  array<mixed> $settings New settings.
	 * @return void
	 * @since  1.0.0
	 */
	public function setSettings( array $settings ): void {
		$this->settings = $settings;
		$this->touch();
	}

	/**
	 * Return the visual styling overrides array.
	 *
	 * @return array<mixed>
	 * @since  1.0.0
	 */
	public function getStyling(): array {
		return $this->styling;
	}

	/**
	 * Replace the styling array and record a modification timestamp.
	 *
	 * @param  array<mixed> $styling New styling overrides.
	 * @return void
	 * @since  1.0.0
	 */
	public function setStyling( array $styling ): void {
		$this->styling = $styling;
		$this->touch();
	}

	/**
	 * Return the current lifecycle status.
	 *
	 * @return SurveyStatus
	 * @since  1.0.0
	 */
	public function getStatus(): SurveyStatus {
		return $this->status;
	}

	/**
	 * Return the targeting conflict reason string, or null when absent.
	 *
	 * @return string|null
	 * @since  1.0.0
	 */
	public function getConflictReason(): ?string {
		return $this->conflictReason;
	}

	/**
	 * Set or clear the targeting conflict reason.
	 *
	 * @param  string|null $reason Conflict explanation, or null to clear.
	 * @return void
	 * @since  1.0.0
	 */
	public function setConflictReason( ?string $reason ): void {
		$this->conflictReason = $reason;
	}

	/**
	 * Return the denormalised response count.
	 *
	 * @return int
	 * @since  1.0.0
	 */
	public function getResponseCount(): int {
		return $this->responseCount;
	}

	/**
	 * Return the WordPress user ID of the survey author.
	 *
	 * @return int
	 * @since  1.0.0
	 */
	public function getCreatedBy(): int {
		return $this->createdBy;
	}

	/**
	 * Return the survey creation timestamp.
	 *
	 * @return DateTimeImmutable
	 * @since  1.0.0
	 */
	public function getCreatedAt(): DateTimeImmutable {
		return $this->createdAt;
	}

	/**
	 * Return the last-updated timestamp, or null when never modified.
	 *
	 * @return DateTimeImmutable|null
	 * @since  1.0.0
	 */
	public function getUpdatedAt(): ?DateTimeImmutable {
		return $this->updatedAt;
	}

	/**
	 * Transition the survey to Published status so it is publicly visible.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function publish(): void {
		$this->status = SurveyStatus::Published;
		$this->touch();
	}

	/**
	 * Transition the survey to Archived status, hiding it from public view.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function archive(): void {
		$this->status = SurveyStatus::Archived;
		$this->touch();
	}

	/**
	 * Move the survey to the Trashed status (soft delete).
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function trash(): void {
		$this->status = SurveyStatus::Trashed;
		$this->touch();
	}

	/**
	 * Restore a trashed survey back to Draft.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function restore(): void {
		$this->status = SurveyStatus::Draft;
		$this->touch();
	}

	/**
	 * Increment the denormalised response counter by one.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	public function incrementResponseCount(): void {
		++$this->responseCount;
		$this->touch();
	}

	/**
	 * Serialise the aggregate to a plain associative array for persistence.
	 *
	 * @return array<string, mixed>
	 * @since  1.0.0
	 */
	public function toArray(): array {
		return [
			'id'             => $this->id,
			'title'          => $this->title,
			'description'    => $this->description,
			'form_schema'    => $this->formSchema,
			'settings'       => $this->settings,
			'styling'        => $this->styling,
			'status'         => $this->status->value,
			'response_count' => $this->responseCount,
			'created_by'     => $this->createdBy,
			'created_at'     => $this->createdAt->format( 'Y-m-d H:i:s' ),
			'updated_at'     => $this->updatedAt?->format( 'Y-m-d H:i:s' ),
		];
	}

	/**
	 * Update the last-modified timestamp to now.
	 *
	 * @return void
	 * @since  1.0.0
	 */
	private function touch(): void {
		$this->updatedAt = new DateTimeImmutable();
	}
}
