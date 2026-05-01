<?php

declare(strict_types=1);

namespace AllFeedback\Tests\Unit\Application\Response;

use AllFeedback\Application\Response\ResponseDTO;
use AllFeedback\Application\Response\SubmitResponseService;
use AllFeedback\Core\Exceptions\NotFoundException;
use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Domain\Response\Response;
use AllFeedback\Domain\Response\ResponseRepository;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyRepository;
use AllFeedback\Domain\Survey\SurveyStatus;
use AllFeedback\Tests\BrainMonkeyTestCase;
use Brain\Monkey\Actions;
use Brain\Monkey\Filters;

class SubmitResponseServiceTest extends BrainMonkeyTestCase {

	private function makeDto( array $overrides = [] ): ResponseDTO {
		return new ResponseDTO(
			surveyId:     $overrides['surveyId']     ?? 1,
			responseData: $overrides['responseData'] ?? [ 'q1' => 'answer' ],
			score:        null,
			pageUrl:      null,
			deviceType:   null,
			consentGiven: false,
			userId:       0,
		);
	}

	private function makePublishedSurvey(): Survey {
		return new Survey( title: 'Test', status: SurveyStatus::Published );
	}

	public function test_throws_not_found_when_survey_missing(): void {
		$this->expectException( NotFoundException::class );

		$surveys   = $this->createMock( SurveyRepository::class );
		$responses = $this->createMock( ResponseRepository::class );

		$surveys->method( 'findById' )->willReturn( null );
		$responses->expects( $this->never() )->method( 'save' );

		$service = new SubmitResponseService( $surveys, $responses );
		$service->execute( $this->makeDto(), 'hash123' );
	}

	public function test_saves_response_and_increments_count_on_success(): void {
		Filters\expectApplied( 'allfeedback_response_max_keys' )->once()->andReturn( 100 );
		Filters\expectApplied( 'allfeedback_response_max_value_length' )->once()->andReturn( 5000 );
		Actions\expectDone( 'allfeedback:response:submitted' )->once();

		$survey    = $this->makePublishedSurvey();
		$surveys   = $this->createMock( SurveyRepository::class );
		$responses = $this->createMock( ResponseRepository::class );

		$surveys->method( 'findById' )->willReturn( $survey );

		$savedResponse = $this->createMock( Response::class );
		$responses->expects( $this->once() )->method( 'save' )->willReturn( $savedResponse );
		$surveys->expects( $this->once() )->method( 'incrementResponseCount' );

		$service = new SubmitResponseService( $surveys, $responses );
		$result  = $service->execute( $this->makeDto(), 'hash123' );

		$this->assertSame( $savedResponse, $result );
	}

	public function test_validation_failure_prevents_save(): void {
		$this->expectException( ValidationException::class );

		$survey    = $this->makePublishedSurvey();
		$surveys   = $this->createMock( SurveyRepository::class );
		$responses = $this->createMock( ResponseRepository::class );

		$surveys->method( 'findById' )->willReturn( $survey );
		$responses->expects( $this->never() )->method( 'save' );

		$service = new SubmitResponseService( $surveys, $responses );
		$service->execute( $this->makeDto( [ 'responseData' => [] ] ), 'hash123' );
	}

	public function test_action_not_fired_on_validation_failure(): void {
		$this->expectException( ValidationException::class );

		Actions\expectDone( 'allfeedback:response:submitted' )->never();

		$survey    = $this->makePublishedSurvey();
		$surveys   = $this->createMock( SurveyRepository::class );
		$responses = $this->createMock( ResponseRepository::class );

		$surveys->method( 'findById' )->willReturn( $survey );

		$service = new SubmitResponseService( $surveys, $responses );

		$service->execute( $this->makeDto( [ 'responseData' => [] ] ), 'hash' );
	}
}
