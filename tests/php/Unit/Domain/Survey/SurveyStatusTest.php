<?php

declare(strict_types=1);

namespace AllFeedback\Tests\Unit\Domain\Survey;

use AllFeedback\Domain\Survey\SurveyStatus;
use AllFeedback\Tests\BrainMonkeyTestCase;

class SurveyStatusTest extends BrainMonkeyTestCase {

	public function test_from_valid_string(): void {
		$this->assertSame( SurveyStatus::Draft,     SurveyStatus::from( 'draft' ) );
		$this->assertSame( SurveyStatus::Published,  SurveyStatus::from( 'published' ) );
		$this->assertSame( SurveyStatus::Archived,   SurveyStatus::from( 'archived' ) );
		$this->assertSame( SurveyStatus::Trashed,    SurveyStatus::from( 'trashed' ) );
	}

	public function test_is_published_only_for_published(): void {
		$this->assertTrue( SurveyStatus::Published->isPublished() );
		$this->assertFalse( SurveyStatus::Draft->isPublished() );
		$this->assertFalse( SurveyStatus::Archived->isPublished() );
		$this->assertFalse( SurveyStatus::Trashed->isPublished() );
	}

	public function test_is_trashed_only_for_trashed(): void {
		$this->assertTrue( SurveyStatus::Trashed->isTrashed() );
		$this->assertFalse( SurveyStatus::Draft->isTrashed() );
		$this->assertFalse( SurveyStatus::Published->isTrashed() );
	}

	public function test_from_invalid_string_throws(): void {
		$this->expectException( \ValueError::class );
		SurveyStatus::from( 'invalid' );
	}
}
