<?php

declare(strict_types=1);

namespace AllFeedback\Domain\Survey;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Domain\Shared\Entity;
use Carbon\CarbonImmutable;

/**
 * Survey aggregate root.
 *
 * Represents a single NPS / CSAT / CES survey definition including its form
 * schema, display settings, targeting rules, lifecycle status, and aggregate
 * response count.
 *
 * @since 1.0.0
 */
class Survey extends Entity {

	/** @since 1.0.0 */
	private SurveyStatus $status;

	/** @since 1.0.0 */
	private int $responseCount;

	/** @since 1.0.0 */
	private CarbonImmutable $createdAt;

	/** @since 1.0.0 */
	private ?CarbonImmutable $updatedAt = null;

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private string $title,
		private string $description = '',
		private array $formSchema = [],
		private array $settings = [],
		private array $targeting = [],
		private int $createdBy = 0,
		?SurveyStatus $status = null,
		int $responseCount = 0,
	) {
		$this->status        = $status ?? SurveyStatus::Draft;
		$this->responseCount = $responseCount;
		$this->createdAt     = CarbonImmutable::now();
	}

	/**
	 * Reconstitute a Survey from a persistence row.
	 *
	 * @since 1.0.0
	 */
	public static function reconstitute(
		int $id,
		string $title,
		string $description,
		array $formSchema,
		array $settings,
		array $targeting,
		SurveyStatus $status,
		int $responseCount,
		int $createdBy,
		CarbonImmutable $createdAt,
		?CarbonImmutable $updatedAt = null,
	): self {
		$survey                = new self( $title, $description, $formSchema, $settings, $targeting, $createdBy, $status, $responseCount );
		$survey->id            = $id;
		$survey->createdAt     = $createdAt;
		$survey->updatedAt     = $updatedAt;
		return $survey;
	}

	/**
	 * @since 1.0.0
	 */
	public function getTitle(): string {
		return $this->title;
	}

	/**
	 * @since 1.0.0
	 */
	public function setTitle( string $title ): void {
		$this->title = $title;
		$this->touch();
	}

	/**
	 * @since 1.0.0
	 */
	public function getDescription(): string {
		return $this->description;
	}

	/**
	 * @since 1.0.0
	 */
	public function setDescription( string $description ): void {
		$this->description = $description;
		$this->touch();
	}

	/**
	 * @since 1.0.0
	 */
	public function getFormSchema(): array {
		return $this->formSchema;
	}

	/**
	 * @since 1.0.0
	 */
	public function setFormSchema( array $formSchema ): void {
		$this->formSchema = $formSchema;
		$this->touch();
	}

	/**
	 * @since 1.0.0
	 */
	public function getSettings(): array {
		return $this->settings;
	}

	/**
	 * @since 1.0.0
	 */
	public function setSettings( array $settings ): void {
		$this->settings = $settings;
		$this->touch();
	}

	/**
	 * @since 1.0.0
	 */
	public function getTargeting(): array {
		return $this->targeting;
	}

	/**
	 * @since 1.0.0
	 */
	public function setTargeting( array $targeting ): void {
		$this->targeting = $targeting;
		$this->touch();
	}

	/**
	 * @since 1.0.0
	 */
	public function getStatus(): SurveyStatus {
		return $this->status;
	}

	/**
	 * @since 1.0.0
	 */
	public function getResponseCount(): int {
		return $this->responseCount;
	}

	/**
	 * @since 1.0.0
	 */
	public function getCreatedBy(): int {
		return $this->createdBy;
	}

	/**
	 * @since 1.0.0
	 */
	public function getCreatedAt(): CarbonImmutable {
		return $this->createdAt;
	}

	/**
	 * @since 1.0.0
	 */
	public function getUpdatedAt(): ?CarbonImmutable {
		return $this->updatedAt;
	}

	/**
	 * Transition the survey to Published status so it is publicly visible.
	 *
	 * @since 1.0.0
	 */
	public function publish(): void {
		$this->status = SurveyStatus::Published;
		$this->touch();
	}

	/**
	 * Transition the survey to Archived status, hiding it from public view.
	 *
	 * @since 1.0.0
	 */
	public function archive(): void {
		$this->status = SurveyStatus::Archived;
		$this->touch();
	}

	/**
	 * Increment the denormalised response counter by one.
	 *
	 * @since 1.0.0
	 */
	public function incrementResponseCount(): void {
		++$this->responseCount;
		$this->touch();
	}

	/**
	 * Serialise the aggregate to a plain associative array for persistence.
	 *
	 * @since 1.0.0
	 */
	public function toArray(): array {
		return [
			'id'             => $this->id,
			'title'          => $this->title,
			'description'    => $this->description,
			'form_schema'    => $this->formSchema,
			'settings'       => $this->settings,
			'targeting'      => $this->targeting,
			'status'         => $this->status->value,
			'response_count' => $this->responseCount,
			'created_by'     => $this->createdBy,
			'created_at'     => $this->createdAt->format( 'Y-m-d H:i:s' ),
			'updated_at'     => $this->updatedAt?->format( 'Y-m-d H:i:s' ),
		];
	}

	/** @since 1.0.0 */
	private function touch(): void {
		$this->updatedAt = CarbonImmutable::now();
	}
}
