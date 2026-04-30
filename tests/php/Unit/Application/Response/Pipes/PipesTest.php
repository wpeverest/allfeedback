<?php

declare(strict_types=1);

namespace AllFeedback\Tests\Unit\Application\Response\Pipes;

use AllFeedback\Application\Response\Pipes\ResponseContext;
use AllFeedback\Application\Response\Pipes\ValidateConsentIfRequired;
use AllFeedback\Application\Response\Pipes\ValidateResponseData;
use AllFeedback\Application\Response\Pipes\ValidateSurveyIsActive;
use AllFeedback\Application\Response\ResponseDTO;
use AllFeedback\Core\Exceptions\ValidationException;
use AllFeedback\Domain\Survey\Survey;
use AllFeedback\Domain\Survey\SurveyStatus;
use AllFeedback\Tests\BrainMonkeyTestCase;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;

class PipesTest extends BrainMonkeyTestCase {

	// ── Helpers ──────────────────────────────────────────────────────────────

	private function makeDto( array $overrides = [] ): ResponseDTO {
		return new ResponseDTO(
			surveyId:     1,
			responseData: $overrides['responseData'] ?? [ 'q1' => 'answer' ],
			score:        $overrides['score']        ?? null,
			pageUrl:      null,
			deviceType:   null,
			consentGiven: $overrides['consentGiven'] ?? false,
			userId:       $overrides['userId']       ?? 0,
		);
	}

	private function makeSurvey( SurveyStatus $status = SurveyStatus::Published, array $settings = [] ): Survey {
		return new Survey( title: 'Test', status: $status, settings: $settings );
	}

	private function makeContext( ResponseDTO $dto, Survey $survey ): ResponseContext {
		return new ResponseContext( dto: $dto, survey: $survey );
	}

	private function noopNext(): \Closure {
		return static fn( ResponseContext $ctx ) => $ctx;
	}

	// ── ValidateResponseData ──────────────────────────────────────────────────

	public function test_validate_response_data_passes_with_valid_data(): void {
		Filters\expectApplied( 'allfeedback_response_max_keys' )->once()->andReturn( 100 );
		Filters\expectApplied( 'allfeedback_response_max_value_length' )->once()->andReturn( 5000 );

		$ctx  = $this->makeContext( $this->makeDto(), $this->makeSurvey() );
		$pipe = new ValidateResponseData();
		$pipe->execute( $ctx, $this->noopNext() );
		$this->assertTrue( true ); // no exception = pass
	}

	public function test_validate_response_data_throws_when_empty(): void {
		$this->expectException( ValidationException::class );

		$ctx  = $this->makeContext( $this->makeDto( [ 'responseData' => [] ] ), $this->makeSurvey() );
		$pipe = new ValidateResponseData();
		$pipe->execute( $ctx, $this->noopNext() );
	}

	public function test_validate_response_data_throws_when_too_many_keys(): void {
		$this->expectException( ValidationException::class );

		Filters\expectApplied( 'allfeedback_response_max_keys' )->once()->andReturn( 2 );

		$data = array_fill_keys( [ 'a', 'b', 'c' ], 'x' );
		$ctx  = $this->makeContext( $this->makeDto( [ 'responseData' => $data ] ), $this->makeSurvey() );
		$pipe = new ValidateResponseData();
		$pipe->execute( $ctx, $this->noopNext() );
	}

	public function test_validate_response_data_throws_when_value_too_long(): void {
		$this->expectException( ValidationException::class );

		Filters\expectApplied( 'allfeedback_response_max_keys' )->once()->andReturn( 100 );
		Filters\expectApplied( 'allfeedback_response_max_value_length' )->once()->andReturn( 5 );

		$ctx  = $this->makeContext( $this->makeDto( [ 'responseData' => [ 'q1' => str_repeat( 'x', 10 ) ] ] ), $this->makeSurvey() );
		$pipe = new ValidateResponseData();
		$pipe->execute( $ctx, $this->noopNext() );
	}

	// ── ValidateSurveyIsActive ────────────────────────────────────────────────

	public function test_validate_survey_is_active_passes_for_published(): void {
		$ctx  = $this->makeContext( $this->makeDto(), $this->makeSurvey( SurveyStatus::Published ) );
		$pipe = new ValidateSurveyIsActive();
		$pipe->execute( $ctx, $this->noopNext() );
		$this->assertTrue( true );
	}

	public function test_validate_survey_is_active_throws_for_draft(): void {
		$this->expectException( ValidationException::class );

		$ctx  = $this->makeContext( $this->makeDto( [ 'userId' => 0 ] ), $this->makeSurvey( SurveyStatus::Draft ) );
		$pipe = new ValidateSurveyIsActive();
		$pipe->execute( $ctx, $this->noopNext() );
	}

	public function test_validate_survey_is_active_admin_bypasses_check(): void {
		Functions\expect( 'user_can' )->once()->andReturn( true );

		$ctx  = $this->makeContext( $this->makeDto( [ 'userId' => 1 ] ), $this->makeSurvey( SurveyStatus::Draft ) );
		$pipe = new ValidateSurveyIsActive();
		$pipe->execute( $ctx, $this->noopNext() );
		$this->assertTrue( true );
	}

	// ── ValidateConsentIfRequired ─────────────────────────────────────────────

	public function test_consent_not_required_passes_without_consent(): void {
		$ctx  = $this->makeContext( $this->makeDto( [ 'consentGiven' => false ] ), $this->makeSurvey( settings: [] ) );
		$pipe = new ValidateConsentIfRequired();
		$pipe->execute( $ctx, $this->noopNext() );
		$this->assertTrue( true );
	}

	public function test_consent_required_and_given_passes(): void {
		$ctx  = $this->makeContext(
			$this->makeDto( [ 'consentGiven' => true ] ),
			$this->makeSurvey( settings: [ 'require_consent' => true ] )
		);
		$pipe = new ValidateConsentIfRequired();
		$pipe->execute( $ctx, $this->noopNext() );
		$this->assertTrue( true );
	}

	public function test_consent_required_but_not_given_throws(): void {
		$this->expectException( ValidationException::class );

		$ctx  = $this->makeContext(
			$this->makeDto( [ 'consentGiven' => false ] ),
			$this->makeSurvey( settings: [ 'require_consent' => true ] )
		);
		$pipe = new ValidateConsentIfRequired();
		$pipe->execute( $ctx, $this->noopNext() );
	}
}
