<?php

declare(strict_types=1);

namespace AllFeedback\Infrastructure\Google;

defined( 'ABSPATH' ) || exit;

use AllFeedback\Support\Logger;
use Carbon\CarbonImmutable;
use Google\Client as GoogleClient;
use Google\Service\Calendar;
use Google\Service\Calendar\ConferenceData;
use Google\Service\Calendar\ConferenceSolutionKey;
use Google\Service\Calendar\CreateConferenceRequest;
use Google\Service\Calendar\Event;
use Google\Service\Calendar\EventAttendee;
use Google\Service\Calendar\EventDateTime;
use Google\Service\Calendar\EventReminder;
use Google\Service\Calendar\EventReminders;
use Google\Service\Exception as GoogleServiceException;

/**
 * Creates, updates, and deletes Google Calendar events on behalf of a user.
 *
 * Intended for future survey-scheduling features (e.g. timed survey launch
 * reminders or interview scheduling).  All operations obtain a valid access
 * token via GoogleOAuthClient before calling the Calendar API.
 *
 * @since 1.0.0
 */
class GoogleCalendarService {

	/** @since 1.0.0 */
	private const CALENDAR_ID = 'primary';

	/**
	 * @since 1.0.0
	 */
	public function __construct(
		private readonly GoogleOAuthClient $oauthClient,
		private readonly GoogleTokenManager $tokenManager,
		private readonly Logger $logger,
	) {}

	/**
	 * Create a new Calendar event for the given user.
	 *
	 * @param int                  $userId    WordPress user ID.
	 * @param array<string, mixed> $eventData Associative array with keys: summary, description, start, end, attendees, timezone.
	 * @return array{event_id: string, meeting_url: string|null}|null Null on failure or when not connected.
	 * @since 1.0.0
	 */
	public function createEvent( int $userId, array $eventData ): ?array {
		$accessToken = $this->oauthClient->getValidAccessToken( $userId );
		if ( ! $accessToken ) {
			return null;
		}

		$event = $this->buildEvent( $eventData );

		$requestId      = 'allfb-' . $userId . '-' . time();
		$createRequest  = new CreateConferenceRequest();
		$createRequest->setRequestId( $requestId );
		$key = new ConferenceSolutionKey();
		$key->setType( 'hangoutsMeet' );
		$createRequest->setConferenceSolutionKey( $key );
		$conferenceData = new ConferenceData();
		$conferenceData->setCreateRequest( $createRequest );
		$event->setConferenceData( $conferenceData );

		try {
			$calendar     = $this->getCalendarService( $accessToken );
			$createdEvent = $calendar->events->insert( self::CALENDAR_ID, $event, [ 'conferenceDataVersion' => 1 ] );
		} catch ( GoogleServiceException $e ) {
			$this->logger->error(
				'Google Calendar event creation failed',
				[
					'error'  => $e->getMessage(),
					'code'   => $e->getCode(),
					'errors' => $e->getErrors(),
				]
			);
			return null;
		}

		return [
			'event_id'    => $createdEvent->getId(),
			'meeting_url' => $this->extractMeetingUrl( $createdEvent ),
		];
	}

	/**
	 * Update an existing Calendar event.
	 *
	 * @param int                  $userId          WordPress user ID.
	 * @param string               $calendarEventId Google Calendar event ID.
	 * @param array<string, mixed> $eventData       Updated event data.
	 * @return array{event_id: string, meeting_url: string|null}|null
	 * @since 1.0.0
	 */
	public function updateEvent( int $userId, string $calendarEventId, array $eventData ): ?array {
		$accessToken = $this->oauthClient->getValidAccessToken( $userId );
		if ( ! $accessToken ) {
			return null;
		}

		$event = $this->buildEvent( $eventData );

		try {
			$calendar     = $this->getCalendarService( $accessToken );
			$updatedEvent = $calendar->events->patch(
				self::CALENDAR_ID,
				$calendarEventId,
				$event,
				[ 'conferenceDataVersion' => 1 ]
			);
		} catch ( GoogleServiceException $e ) {
			$this->logger->error(
				'Google Calendar event update failed',
				[
					'error'    => $e->getMessage(),
					'code'     => $e->getCode(),
					'event_id' => $calendarEventId,
				]
			);
			return null;
		}

		return [
			'event_id'    => $updatedEvent->getId() ?? $calendarEventId,
			'meeting_url' => $this->extractMeetingUrl( $updatedEvent ),
		];
	}

	/**
	 * Delete a Calendar event.
	 *
	 * @param int    $userId          WordPress user ID.
	 * @param string $calendarEventId Google Calendar event ID.
	 * @since 1.0.0
	 */
	public function deleteEvent( int $userId, string $calendarEventId ): bool {
		$accessToken = $this->oauthClient->getValidAccessToken( $userId );
		if ( ! $accessToken ) {
			return false;
		}

		try {
			$calendar = $this->getCalendarService( $accessToken );
			$calendar->events->delete( self::CALENDAR_ID, $calendarEventId );
			return true;
		} catch ( GoogleServiceException $e ) {
			$this->logger->error(
				'Google Calendar event deletion failed',
				[
					'error'    => $e->getMessage(),
					'code'     => $e->getCode(),
					'event_id' => $calendarEventId,
				]
			);
			return false;
		}
	}

	/**
	 * Build a Google Calendar Event object from the supplied data array.
	 *
	 * @param array<string, mixed> $data Keys: summary, description, start (Y-m-d\TH:i:s), end, timezone, attendees[].
	 * @since 1.0.0
	 */
	private function buildEvent( array $data ): Event {
		$timezone = $this->resolveIanaTimezone( (string) ( $data['timezone'] ?? '' ) );

		$start = new EventDateTime();
		$start->setDateTime( (string) ( $data['start'] ?? '' ) );
		$start->setTimeZone( $timezone );

		$end = new EventDateTime();
		$end->setDateTime( (string) ( $data['end'] ?? '' ) );
		$end->setTimeZone( $timezone );

		$attendees = [];
		foreach ( (array) ( $data['attendees'] ?? [] ) as $attendeeEmail ) {
			if ( is_string( $attendeeEmail ) && filter_var( $attendeeEmail, FILTER_VALIDATE_EMAIL ) ) {
				$attendee = new EventAttendee();
				$attendee->setEmail( $attendeeEmail );
				$attendees[] = $attendee;
			}
		}

		$emailReminder = new EventReminder();
		$emailReminder->setMethod( 'email' );
		$emailReminder->setMinutes( 24 * 60 );

		$popupReminder = new EventReminder();
		$popupReminder->setMethod( 'popup' );
		$popupReminder->setMinutes( 30 );

		$reminders = new EventReminders();
		$reminders->setUseDefault( false );
		$reminders->setOverrides( [ $emailReminder, $popupReminder ] );

		$event = new Event();
		$event->setSummary( (string) ( $data['summary'] ?? '' ) );
		$event->setDescription( (string) ( $data['description'] ?? '' ) );
		$event->setStart( $start );
		$event->setEnd( $end );
		$event->setAttendees( $attendees );
		$event->setReminders( $reminders );

		return $event;
	}

	/**
	 * Return a Calendar service instance authenticated with the supplied token.
	 *
	 * @since 1.0.0
	 */
	private function getCalendarService( string $accessToken ): Calendar {
		$client = new GoogleClient();
		$client->setAccessToken(
			[
				'access_token' => $accessToken,
				'created'      => time(),
				'expires_in'   => 3600,
			]
		);

		return new Calendar( $client );
	}

	/**
	 * Resolve a timezone string to a valid IANA identifier, falling back to WordPress site timezone.
	 *
	 * @since 1.0.0
	 */
	private function resolveIanaTimezone( string $timezone ): string {
		$timezone = trim( $timezone );

		if ( $timezone !== '' && ! preg_match( '/^[+-]\d/', $timezone ) ) {
			try {
				new \DateTimeZone( $timezone );
				return $timezone;
			} catch ( \Exception ) { // phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedCatch
			}
		}

		$wpTimezone = wp_timezone_string();
		if ( $wpTimezone !== '' && ! preg_match( '/^[+-]\d/', $wpTimezone ) ) {
			try {
				new \DateTimeZone( $wpTimezone );
				return $wpTimezone;
			} catch ( \Exception ) { // phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedCatch
			}
		}

		try {
			$wpTz   = wp_timezone();
			$offset = $wpTz->getOffset( CarbonImmutable::now( new \DateTimeZone( 'UTC' ) ) );
			$abbrs  = \DateTimeZone::listAbbreviations();

			foreach ( $abbrs as $zones ) {
				foreach ( $zones as $zone ) {
					if ( $zone['offset'] === $offset && $zone['timezone_id'] !== '' ) {
						return $zone['timezone_id'];
					}
				}
			}
		} catch ( \Exception ) { // phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedCatch
		}

		return 'UTC';
	}

	/**
	 * Extract the Google Meet video URL from a Calendar event, if present.
	 *
	 * @since 1.0.0
	 */
	private function extractMeetingUrl( Event $event ): ?string {
		if ( $event->hangoutLink ?? null ) {
			return $event->hangoutLink;
		}

		$conferenceData = $event->getConferenceData();
		if ( ! $conferenceData ) {
			return null;
		}

		$entryPoints = $conferenceData->getEntryPoints();
		if ( ! $entryPoints ) {
			return null;
		}

		foreach ( $entryPoints as $entry ) {
			if ( $entry->getEntryPointType() === 'video' ) {
				return $entry->getUri();
			}
		}

		return null;
	}
}
