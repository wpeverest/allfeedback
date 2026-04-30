<?php

declare(strict_types=1);

namespace AllFeedback\Tests\Unit\Domain\Response;

use AllFeedback\Domain\Response\ResponseScore;
use AllFeedback\Tests\BrainMonkeyTestCase;

class ResponseScoreTest extends BrainMonkeyTestCase {

	public function test_valid_nps_score(): void {
		$score = new ResponseScore( 8.0, 'nps' );
		$this->assertSame( 8.0, $score->getValue() );
		$this->assertSame( 'nps', $score->getType() );
	}

	public function test_invalid_type_throws(): void {
		$this->expectException( \InvalidArgumentException::class );
		new ResponseScore( 5.0, 'csat' );
	}

	/** @dataProvider npsCategories */
	public function test_nps_category( float $value, string $expected ): void {
		$score = new ResponseScore( $value, 'nps' );
		$this->assertSame( $expected, $score->getNpsCategory() );
	}

	/** @return array<string, array{float, string}> */
	public static function npsCategories(): array {
		return [
			'promoter at 9'   => [ 9.0,  'promoter' ],
			'promoter at 10'  => [ 10.0, 'promoter' ],
			'passive at 7'    => [ 7.0,  'passive' ],
			'passive at 8'    => [ 8.0,  'passive' ],
			'detractor at 6'  => [ 6.0,  'detractor' ],
			'detractor at 0'  => [ 0.0,  'detractor' ],
		];
	}
}
