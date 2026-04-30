<?php

declare(strict_types=1);

namespace AllFeedback\Tests\Unit\Domain\Survey;

use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyStatus;
use AllFeedback\Tests\BrainMonkeyTestCase;

class SurveyTest extends BrainMonkeyTestCase {

	private function makeSurvey( ?SurveyStatus $status = null ): Survey {
		return new Survey( title: 'Test Survey', status: $status );
	}

	public function test_new_survey_defaults_to_draft(): void {
		$survey = $this->makeSurvey();
		$this->assertSame( SurveyStatus::Draft, $survey->getStatus() );
		$this->assertTrue( $survey->isNew() );
		$this->assertSame( 0, $survey->getResponseCount() );
	}

	public function test_publish_transitions_to_published(): void {
		$survey = $this->makeSurvey();
		$survey->publish();
		$this->assertSame( SurveyStatus::Published, $survey->getStatus() );
		$this->assertNotNull( $survey->getUpdatedAt() );
	}

	public function test_archive_transitions_to_archived(): void {
		$survey = $this->makeSurvey( SurveyStatus::Published );
		$survey->archive();
		$this->assertSame( SurveyStatus::Archived, $survey->getStatus() );
	}

	public function test_trash_and_restore(): void {
		$survey = $this->makeSurvey( SurveyStatus::Published );
		$survey->trash();
		$this->assertSame( SurveyStatus::Trashed, $survey->getStatus() );
		$survey->restore();
		$this->assertSame( SurveyStatus::Draft, $survey->getStatus() );
	}

	public function test_set_status_by_string(): void {
		$survey = $this->makeSurvey();
		$survey->setStatus( 'published' );
		$this->assertSame( SurveyStatus::Published, $survey->getStatus() );
	}

	public function test_conflict_reason_set_and_cleared(): void {
		$survey = $this->makeSurvey();
		$this->assertNull( $survey->getConflictReason() );
		$survey->setConflictReason( 'Overlaps with survey #2' );
		$this->assertSame( 'Overlaps with survey #2', $survey->getConflictReason() );
		$survey->setConflictReason( null );
		$this->assertNull( $survey->getConflictReason() );
	}

	public function test_increment_response_count(): void {
		$survey = $this->makeSurvey();
		$survey->incrementResponseCount();
		$this->assertSame( 1, $survey->getResponseCount() );
	}

	public function test_reconstitute_sets_id(): void {
		$survey = Survey::reconstitute(
			id: 42,
			title: 'Reconstituted',
			description: '',
			formSchema: [],
			settings: [],
			status: SurveyStatus::Published,
			responseCount: 5,
			createdBy: 1,
			createdAt: new \DateTimeImmutable(),
		);
		$this->assertSame( 42, $survey->getId() );
		$this->assertFalse( $survey->isNew() );
		$this->assertSame( 5, $survey->getResponseCount() );
	}

	public function test_to_array_contains_expected_keys(): void {
		$survey = $this->makeSurvey();
		$arr    = $survey->toArray();
		foreach ( [ 'title', 'status', 'response_count', 'form_schema', 'settings' ] as $key ) {
			$this->assertArrayHasKey( $key, $arr );
		}
		$this->assertSame( 'draft', $arr['status'] );
	}
}
