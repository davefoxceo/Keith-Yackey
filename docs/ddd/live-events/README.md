# LiveEvents Bounded Context

## Overview

The LiveEvents Context manages live audio events hosted by Coach Keith -- group coaching calls, Q&A sessions, Brotherhood gatherings, and special topic deep-dives. It handles scheduling, registration, capacity management, the live event lifecycle, recordings, and AI-generated recaps.

**Core Responsibilities:**
- Schedule and manage live events with capacity limits
- Handle user registration and waitlists
- Manage the live event lifecycle (scheduled, live, ended)
- Integrate with audio room infrastructure for live audio
- Manage event recordings and make them available post-event
- Generate AI-powered event recaps from recordings
- Track participation history for engagement metrics

**Upstream Dependencies:** Identity Context (user profiles), Subscription Context (entitlements gate live event access), Content Context (recordings feed back into content library)

**Downstream Consumers:** Engagement Context (event participation counts toward engagement), Content Context (recordings become content), Community Context (event recaps shared to Brotherhood)

---

## Aggregates

### LiveEvent

The LiveEvent aggregate represents a single scheduled event and its full lifecycle from scheduling through recording availability.

```typescript
interface LiveEvent {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly hostId: UserId; // Keith or a designated facilitator
  readonly eventType: EventType;
  readonly status: EventStatus;
  schedule: EventSchedule;
  capacity: EventCapacity;
  audioRoomConfig: AudioRoomConfig;
  audioRoomId: string | null;
  recordings: EventRecording[];
  recap: EventRecap | null;
  dialFocus: DialType | null;
  topicTags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;

  publish(): LiveEventScheduled;
  openRegistration(): EventRegistrationOpened;
  closeRegistration(): void;
  start(audioRoomId: string): LiveEventStarted;
  end(): LiveEventEnded;
  addRecording(recording: EventRecording): EventRecordingAvailable;
  generateRecap(recap: EventRecap): EventRecapGenerated;
  cancel(reason: string): void;
  reschedule(newSchedule: EventSchedule): void;
  isRegistrationOpen(): boolean;
  hasCapacity(): boolean;
  getWaitlistCount(): number;
}
```

**Invariants:**
- An event cannot start before its scheduled start time (with a 5-minute early window)
- An event cannot be started if its status is not 'registration_open' or 'registration_closed'
- Registration cannot be opened for a cancelled event
- Capacity cannot be exceeded -- users beyond capacity go to waitlist
- Only one event can be live at a time per host
- Recordings can only be added after the event has ended
- A recap can only be generated after at least one recording is available
- Event schedule must be at least 24 hours in the future when created
- Maximum event duration is 3 hours

### EventParticipation

The EventParticipation aggregate tracks a user's registration, attendance, and engagement with a specific event.

```typescript
interface EventParticipation {
  readonly id: string;
  readonly eventId: string;
  readonly userId: UserId;
  readonly registeredAt: Timestamp;
  status: ParticipationStatus;
  joinedAt: Timestamp | null;
  leftAt: Timestamp | null;
  durationAttendedMs: number;
  waitlistPosition: number | null;
  promotedFromWaitlistAt: Timestamp | null;
  feedback: EventFeedback | null;

  register(): UserRegisteredForEvent;
  joinWaitlist(position: number): void;
  promoteFromWaitlist(): void;
  join(): void;
  leave(): void;
  submitFeedback(feedback: EventFeedback): void;
  cancel(): void;
}
```

**Invariants:**
- A user can only register once for a given event
- A user cannot join an event they are not registered for
- A user cannot join an event that has not started
- A user on the waitlist is automatically promoted if capacity opens up
- Feedback can only be submitted after the event has ended
- Duration attended is calculated from join/leave timestamps
- A cancelled registration cannot be re-activated

---

## Entities

### EventSchedule

The scheduling details for a live event, including timezone handling for a geographically distributed user base.

```typescript
interface EventSchedule {
  readonly id: string;
  readonly eventId: string;
  readonly scheduledStartTime: Timestamp;
  readonly scheduledEndTime: Timestamp;
  readonly timezone: string; // IANA timezone for display, e.g., 'America/Denver'
  readonly durationMinutes: number;
  readonly recurrence: EventRecurrence | null;
  actualStartTime: Timestamp | null;
  actualEndTime: Timestamp | null;
}

interface EventRecurrence {
  readonly pattern: 'weekly' | 'biweekly' | 'monthly';
  readonly dayOfWeek: number; // 0-6, Sunday = 0
  readonly endAfterOccurrences: number | null;
  readonly endDate: Timestamp | null;
}
```

### EventRecording

A recording of a live event, stored and made available to entitled users.

```typescript
interface EventRecording {
  readonly id: string;
  readonly eventId: string;
  readonly audioUrl: string;
  readonly durationMs: number;
  readonly fileSize: number; // Bytes
  readonly format: 'mp3' | 'aac' | 'm4a';
  readonly recordedAt: Timestamp;
  readonly availableAt: Timestamp; // When it became available to users
  readonly transcriptId: string | null; // Links to Content context transcript
  readonly processingStatus: 'processing' | 'available' | 'failed';
}
```

---

## Value Objects

```typescript
/** Type of live event */
type EventType =
  | 'group_coaching' // Keith coaches a group through a topic
  | 'qa_session' // Open Q&A with Keith
  | 'brotherhood_gathering' // Community connection session
  | 'deep_dive' // Extended session on a specific topic/framework
  | 'guest_expert'; // Keith brings in a guest speaker

/** Current state of a live event */
type EventStatus =
  | 'draft' // Created but not published
  | 'scheduled' // Published, registration not yet open
  | 'registration_open' // Users can register
  | 'registration_closed' // Registration manually closed or capacity reached
  | 'live' // Event is currently happening
  | 'ended' // Event has concluded
  | 'cancelled'; // Event was cancelled

/** User's participation state for an event */
type ParticipationStatus =
  | 'registered' // Confirmed registration
  | 'waitlisted' // On the waitlist
  | 'attended' // Joined and stayed for meaningful duration
  | 'partial' // Joined but left early (< 50% of event)
  | 'no_show' // Registered but did not attend
  | 'cancelled'; // User cancelled their registration

/** Capacity tracking for an event */
interface EventCapacity {
  readonly maxParticipants: number;
  readonly registeredCount: number;
  readonly waitlistCount: number;
  readonly attendedCount: number; // Filled after event ends
  readonly waitlistEnabled: boolean;
  readonly maxWaitlist: number; // Maximum waitlist size
}

/** Audio room configuration passed to the Audio Room ACL */
interface AudioRoomConfig {
  readonly maxParticipants: number;
  readonly enableRecording: boolean;
  readonly enableChat: boolean;
  readonly enableHandRaise: boolean;
  readonly enableQueuedQuestions: boolean; // For Q&A format
  readonly muteOnEntry: boolean;
}

/** AI-generated recap of a live event */
interface EventRecap {
  readonly summary: string; // 2-3 paragraph summary
  readonly keyTakeaways: string[]; // Bullet point highlights
  readonly frameworksDiscussed: ContentReference[];
  readonly questionsAnswered: {
    readonly question: string;
    readonly answerSummary: string;
    readonly timestampMs: number;
  }[];
  readonly dialRelevance: DialType[];
  readonly generatedAt: Timestamp;
  readonly generatedFrom: string; // Recording ID used for generation
}

/** User feedback on an event */
interface EventFeedback {
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly helpfulnessRating: 1 | 2 | 3 | 4 | 5;
  readonly wouldAttendAgain: boolean;
  readonly freeformFeedback: string | null; // Max 1000 chars
  readonly suggestedTopics: string[]; // Topics they want covered in future events
  readonly submittedAt: Timestamp;
}
```

---

## Domain Events

```typescript
interface LiveEventScheduled {
  readonly eventType: 'live_events.event_scheduled';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly eventId: string;
    readonly title: string;
    readonly eventType: EventType;
    readonly scheduledStartTime: Timestamp;
    readonly scheduledEndTime: Timestamp;
    readonly maxParticipants: number;
    readonly dialFocus: DialType | null;
    readonly hostId: UserId;
  };
}

interface EventRegistrationOpened {
  readonly eventType: 'live_events.registration_opened';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly eventId: string;
    readonly title: string;
    readonly scheduledStartTime: Timestamp;
    readonly maxParticipants: number;
    readonly registrationDeadline: Timestamp | null;
  };
}

interface UserRegisteredForEvent {
  readonly eventType: 'live_events.user_registered';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly eventId: string;
    readonly userId: UserId;
    readonly participationId: string;
    readonly isWaitlisted: boolean;
    readonly waitlistPosition: number | null;
    readonly registeredCount: number;
    readonly remainingCapacity: number;
  };
}

interface LiveEventStarted {
  readonly eventType: 'live_events.event_started';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly eventId: string;
    readonly title: string;
    readonly audioRoomId: string;
    readonly registeredParticipants: number;
    readonly actualStartTime: Timestamp;
  };
}

interface LiveEventEnded {
  readonly eventType: 'live_events.event_ended';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly eventId: string;
    readonly title: string;
    readonly actualDurationMinutes: number;
    readonly peakParticipants: number;
    readonly totalAttendees: number;
    readonly noShowCount: number;
  };
}

interface EventRecordingAvailable {
  readonly eventType: 'live_events.recording_available';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly eventId: string;
    readonly recordingId: string;
    readonly audioUrl: string;
    readonly durationMs: number;
    readonly format: string;
  };
}

interface EventRecapGenerated {
  readonly eventType: 'live_events.recap_generated';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly eventId: string;
    readonly recapSummaryLength: number;
    readonly keyTakeawayCount: number;
    readonly frameworksDiscussedCount: number;
    readonly questionsAnsweredCount: number;
    readonly dialRelevance: DialType[];
  };
}
```

---

## Repositories

```typescript
interface LiveEventRepository {
  /** Find event by ID */
  findById(id: string): Promise<LiveEvent | null>;

  /** Find upcoming events (scheduled or registration open) */
  findUpcoming(limit: number): Promise<LiveEvent[]>;

  /** Find events by status */
  findByStatus(status: EventStatus): Promise<LiveEvent[]>;

  /** Find past events with recordings available */
  findWithRecordings(
    pagination: { cursor: string | null; limit: number }
  ): Promise<PaginatedResult<LiveEvent>>;

  /** Find events by type */
  findByType(type: EventType): Promise<LiveEvent[]>;

  /** Find events by dial focus */
  findByDialFocus(dial: DialType): Promise<LiveEvent[]>;

  /** Check if a host has any currently live events */
  hasLiveEvent(hostId: UserId): Promise<boolean>;

  /** Get events in a date range (for calendar view) */
  findByDateRange(startDate: Timestamp, endDate: Timestamp): Promise<LiveEvent[]>;

  /** Persist an event */
  save(event: LiveEvent): Promise<void>;
}

interface EventParticipationRepository {
  /** Find participation by ID */
  findById(id: string): Promise<EventParticipation | null>;

  /** Find a user's participation for a specific event */
  findByEventAndUser(eventId: string, userId: UserId): Promise<EventParticipation | null>;

  /** Get all participants for an event */
  findByEventId(eventId: string): Promise<EventParticipation[]>;

  /** Get waitlist for an event, ordered by position */
  findWaitlistByEventId(eventId: string): Promise<EventParticipation[]>;

  /** Get a user's event history */
  findByUserId(
    userId: UserId,
    pagination: { cursor: string | null; limit: number }
  ): Promise<PaginatedResult<EventParticipation>>;

  /** Get attendance stats for a user */
  getAttendanceStats(userId: UserId): Promise<{
    totalRegistered: number;
    totalAttended: number;
    totalNoShows: number;
    averageAttendanceDurationMinutes: number;
  }>;

  /** Count registrations for an event (for capacity checks) */
  countByEventId(eventId: string): Promise<number>;

  /** Persist participation */
  save(participation: EventParticipation): Promise<void>;
}

interface EventRecordingRepository {
  /** Find recording by ID */
  findById(id: string): Promise<EventRecording | null>;

  /** Find recordings for an event */
  findByEventId(eventId: string): Promise<EventRecording[]>;

  /** Find recordings pending processing */
  findByProcessingStatus(status: EventRecording['processingStatus']): Promise<EventRecording[]>;

  /** Get all available recordings, paginated */
  findAvailable(
    pagination: { cursor: string | null; limit: number }
  ): Promise<PaginatedResult<EventRecording>>;

  /** Persist a recording */
  save(recording: EventRecording): Promise<void>;
}
```

---

## Domain Services

### EventLifecycleService

Manages the full lifecycle of a live event from creation through recap generation.

```typescript
interface EventLifecycleService {
  /**
   * Create and schedule a new event.
   * Validates schedule, sets up capacity, and publishes the event.
   */
  scheduleEvent(
    input: ScheduleEventInput
  ): Promise<{ event: LiveEvent; events: DomainEvent[] }>;

  /**
   * Start a live event by creating the audio room and notifying registered users.
   */
  startEvent(eventId: string): Promise<{
    event: LiveEvent;
    audioRoomId: string;
    events: DomainEvent[];
  }>;

  /**
   * End a live event, close the audio room, and trigger recording processing.
   */
  endEvent(eventId: string): Promise<{
    event: LiveEvent;
    events: DomainEvent[];
  }>;

  /**
   * Process a completed recording and generate an AI recap.
   */
  processRecordingAndRecap(
    eventId: string,
    recordingId: string
  ): Promise<{
    recording: EventRecording;
    recap: EventRecap;
    events: DomainEvent[];
  }>;
}

interface ScheduleEventInput {
  readonly title: string;
  readonly description: string;
  readonly hostId: UserId;
  readonly eventType: EventType;
  readonly scheduledStartTime: Timestamp;
  readonly durationMinutes: number;
  readonly timezone: string;
  readonly maxParticipants: number;
  readonly audioRoomConfig: AudioRoomConfig;
  readonly dialFocus: DialType | null;
  readonly topicTags: string[];
  readonly recurrence: EventRecurrence | null;
}
```

### EventRegistrationService

Handles registration, waitlist management, and capacity enforcement.

```typescript
interface EventRegistrationService {
  /**
   * Register a user for an event, checking entitlements and capacity.
   */
  register(
    eventId: string,
    userId: UserId
  ): Promise<{
    participation: EventParticipation;
    isWaitlisted: boolean;
    events: DomainEvent[];
  }>;

  /**
   * Cancel a user's registration and promote next waitlisted user if applicable.
   */
  cancelRegistration(
    eventId: string,
    userId: UserId
  ): Promise<{
    promotedUser: UserId | null;
    events: DomainEvent[];
  }>;

  /**
   * Send reminder notifications to registered users before the event.
   */
  sendReminders(
    eventId: string,
    reminderType: '24_hour' | '1_hour' | '5_minute'
  ): Promise<void>;
}
```

### EventNotificationService

Manages all notifications related to live events.

```typescript
interface EventNotificationService {
  /** Notify all subscribed users when a new event is scheduled */
  notifyNewEvent(event: LiveEvent): Promise<void>;

  /** Notify registered users that the event is starting */
  notifyEventStarting(eventId: string): Promise<void>;

  /** Notify users when a recording is available */
  notifyRecordingAvailable(eventId: string, recordingId: string): Promise<void>;

  /** Notify a waitlisted user that they have been promoted */
  notifyWaitlistPromotion(userId: UserId, eventId: string): Promise<void>;
}
```
