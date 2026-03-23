# Engagement Bounded Context

## Overview

The Engagement Context owns all daily touchpoint mechanics that keep users returning to the Coach Keith app. It manages morning kickstart prompts, evening reflections, streak tracking, and milestone recognition. This context is responsible for building and sustaining the habit loop that drives long-term behavior change.

**Core Responsibilities:**
- Deliver personalized morning kickstart prompts based on user's current dial scores and coaching history
- Collect and store evening reflection responses
- Track engagement streaks with accurate day-boundary calculations
- Recognize and award milestones for meaningful relationship progress
- Calculate engagement scores to surface to other contexts (Coaching, Subscription)

**Upstream Dependencies:** Identity Context (user profile, marriage stage), Assessment Context (dial scores), Coaching Context (session history for prompt personalization)

**Downstream Consumers:** Coaching Context (engagement data informs coaching tone), Subscription Context (engagement metrics for churn prediction), Community Context (milestone sharing)

---

## Aggregates

### EngagementStreak

The EngagementStreak aggregate tracks consecutive days of meaningful app engagement for a user. A "day" is defined by the user's local timezone.

```typescript
interface EngagementStreak {
  readonly userId: UserId;
  currentStreak: StreakCount;
  longestStreak: StreakRecord;
  lastEngagementDate: Timestamp;
  streakStartDate: Timestamp;
  graceWindowUsedToday: boolean;

  extendStreak(engagementDate: Timestamp, userTimezone: string): StreakExtended;
  breakStreak(): StreakBroken;
  checkStreakHealth(currentDate: Timestamp, userTimezone: string): 'active' | 'grace' | 'broken';
}
```

**Invariants:**
- A streak can only be extended once per calendar day (user's local time)
- A streak is broken if no engagement occurs for 2 consecutive calendar days (1-day grace window)
- The longest streak record is immutable once set and can only be replaced by a longer streak
- Streak count must be >= 0
- `lastEngagementDate` must be <= current date
- Grace window resets each calendar day

### DailyEngagement

The DailyEngagement aggregate represents all engagement activities for a single user on a single calendar day.

```typescript
interface DailyEngagement {
  readonly id: string;
  readonly userId: UserId;
  readonly date: string; // ISO date YYYY-MM-DD in user's timezone
  morningKickstart: MorningKickstart | null;
  eveningReflection: EveningReflection | null;
  engagementScore: EngagementScore;
  completedAt: Timestamp | null;

  deliverMorningKickstart(prompt: PromptContent): MorningKickstartDelivered;
  openMorningKickstart(): MorningKickstartOpened;
  completeEveningReflection(response: ReflectionResponse): EveningReflectionCompleted;
  calculateScore(): EngagementScore;
}
```

**Invariants:**
- Only one DailyEngagement per user per calendar day
- Morning kickstart must be delivered before it can be opened
- Evening reflection cannot be completed before 3:00 PM user local time
- Evening reflection can only be completed once per day
- Engagement score is recalculated whenever any component changes
- A day is considered "engaged" if at least the morning kickstart was opened OR the evening reflection was completed

---

## Entities

### MorningKickstart

A personalized morning prompt delivered to the user, tailored to their current dial scores, recent coaching sessions, and marriage stage.

```typescript
interface MorningKickstart {
  readonly id: string;
  readonly dailyEngagementId: string;
  prompt: PromptContent;
  deliveredAt: Timestamp;
  openedAt: Timestamp | null;
  interactedAt: Timestamp | null;
  deliveryChannel: 'push_notification' | 'in_app';
}
```

### EveningReflection

A structured end-of-day check-in where the user reflects on their intentional actions and observations from the day.

```typescript
interface EveningReflection {
  readonly id: string;
  readonly dailyEngagementId: string;
  prompt: PromptContent;
  response: ReflectionResponse;
  completedAt: Timestamp;
  durationSeconds: number;
}
```

### Milestone

A meaningful achievement recognized by the system, tied to real relationship progress rather than vanity metrics.

```typescript
interface Milestone {
  readonly id: string;
  readonly userId: UserId;
  type: MilestoneType;
  earnedAt: Timestamp;
  criteria: MilestoneCriteria;
  acknowledged: boolean;
  sharedToBrotherhood: boolean;
  metadata: Record<string, unknown>;
}
```

---

## Value Objects

```typescript
/** Number of consecutive engaged days in the current streak */
interface StreakCount {
  readonly value: number; // >= 0
}

/** A historical record of the user's longest streak */
interface StreakRecord {
  readonly count: StreakCount;
  readonly startDate: Timestamp;
  readonly endDate: Timestamp;
}

/** Content for a morning kickstart or evening reflection prompt */
interface PromptContent {
  readonly headline: string; // Max 60 chars, punchy and direct
  readonly body: string; // Max 500 chars, the core prompt
  readonly dialFocus: DialType | null; // Which dial this prompt targets, if any
  readonly actionSuggestion: string | null; // A concrete micro-action
  readonly scriptureReference: string | null; // Optional faith-based anchor
  readonly relatedContentRef: ContentReference | null; // Link to podcast/book content
}

/** User's response to an evening reflection */
interface ReflectionResponse {
  readonly winOfTheDay: string; // What went well - required, max 500 chars
  readonly challengeOfTheDay: string | null; // What was hard - optional, max 500 chars
  readonly intentionForTomorrow: string; // One thing to do tomorrow - required, max 300 chars
  readonly moodRating: 1 | 2 | 3 | 4 | 5; // Simple mood check
  readonly dialAdjustments: DialAdjustment[]; // Self-reported dial movements
}

interface DialAdjustment {
  readonly dial: DialType;
  readonly direction: 'improved' | 'declined' | 'same';
}

/** Milestone categories tied to real relationship progress */
type MilestoneType =
  | 'FirstAssessment'
  | 'SevenDayStreak'
  | 'ThirtyDaysIntentional'
  | 'HadHardConversation'
  | 'PlannedRealDate'
  | 'SheInitiated'
  | 'BrotherhoodContributor';

/** Criteria that must be met for a milestone to be awarded */
interface MilestoneCriteria {
  readonly type: MilestoneType;
  readonly description: string;
  readonly requiredEvidence: MilestoneEvidence;
}

type MilestoneEvidence =
  | { kind: 'streak_count'; minimumDays: number }
  | { kind: 'assessment_completed'; assessmentId: string }
  | { kind: 'self_reported'; reflectionId: string; keyword: string }
  | { kind: 'community_activity'; minimumPosts: number }
  | { kind: 'coaching_confirmed'; sessionId: string };

/** Composite score representing daily engagement quality */
interface EngagementScore {
  readonly value: number; // 0-100
  readonly components: {
    morningKickstartOpened: boolean; // 25 points
    morningKickstartInteracted: boolean; // 10 points
    eveningReflectionCompleted: boolean; // 40 points
    reflectionDepth: number; // 0-15 points based on response length/quality
    coachingSessionToday: boolean; // 10 points (from Coaching context)
  };
}
```

---

## Domain Events

```typescript
interface MorningKickstartDelivered {
  readonly eventType: 'engagement.morning_kickstart_delivered';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly dailyEngagementId: string;
    readonly kickstartId: string;
    readonly promptContent: PromptContent;
    readonly deliveryChannel: 'push_notification' | 'in_app';
    readonly date: string; // YYYY-MM-DD
  };
}

interface MorningKickstartOpened {
  readonly eventType: 'engagement.morning_kickstart_opened';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly dailyEngagementId: string;
    readonly kickstartId: string;
    readonly openedAt: Timestamp;
    readonly deliveryToOpenDurationSeconds: number;
  };
}

interface EveningReflectionCompleted {
  readonly eventType: 'engagement.evening_reflection_completed';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly dailyEngagementId: string;
    readonly reflectionId: string;
    readonly response: ReflectionResponse;
    readonly engagementScore: EngagementScore;
    readonly date: string;
  };
}

interface StreakExtended {
  readonly eventType: 'engagement.streak_extended';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly newStreakCount: StreakCount;
    readonly date: string;
    readonly usedGraceWindow: boolean;
  };
}

interface StreakBroken {
  readonly eventType: 'engagement.streak_broken';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly previousStreakCount: StreakCount;
    readonly lastEngagementDate: string;
    readonly brokenDate: string;
  };
}

interface MilestoneEarned {
  readonly eventType: 'engagement.milestone_earned';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly milestoneId: string;
    readonly milestoneType: MilestoneType;
    readonly criteria: MilestoneCriteria;
  };
}

interface StreakMilestoneReached {
  readonly eventType: 'engagement.streak_milestone_reached';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly streakCount: StreakCount;
    readonly milestoneThreshold: number; // 7, 14, 30, 60, 90, etc.
    readonly isPersonalRecord: boolean;
  };
}
```

---

## Repositories

```typescript
interface StreakRepository {
  /** Get the current streak for a user. Returns null if no streak exists. */
  findByUserId(userId: UserId): Promise<EngagementStreak | null>;

  /** Persist streak state after extension or break */
  save(streak: EngagementStreak): Promise<void>;

  /** Get top streaks for leaderboard display */
  findTopStreaks(limit: number): Promise<EngagementStreak[]>;

  /** Find all streaks that may be broken (no engagement since yesterday) */
  findStaleStreaks(cutoffDate: Timestamp): Promise<EngagementStreak[]>;
}

interface DailyEngagementRepository {
  /** Find engagement for a specific user and date */
  findByUserAndDate(userId: UserId, date: string): Promise<DailyEngagement | null>;

  /** Get engagement history for a user within a date range */
  findByUserAndDateRange(
    userId: UserId,
    startDate: string,
    endDate: string
  ): Promise<DailyEngagement[]>;

  /** Persist a daily engagement record */
  save(engagement: DailyEngagement): Promise<void>;

  /** Get engagement summary stats for a user */
  getEngagementStats(userId: UserId): Promise<{
    totalDaysEngaged: number;
    averageScore: number;
    reflectionCompletionRate: number;
  }>;
}

interface MilestoneRepository {
  /** Get all milestones earned by a user */
  findByUserId(userId: UserId): Promise<Milestone[]>;

  /** Check if a user has earned a specific milestone type */
  hasEarned(userId: UserId, type: MilestoneType): Promise<boolean>;

  /** Persist a newly earned milestone */
  save(milestone: Milestone): Promise<void>;

  /** Get recently earned milestones across all users (for Brotherhood feed) */
  findRecent(limit: number): Promise<Milestone[]>;
}

interface PromptContentRepository {
  /** Get a morning kickstart prompt tailored to user context */
  getMorningPrompt(
    dialScores: Record<DialType, number>,
    marriageStage: MarriageStage,
    recentTopics: string[]
  ): Promise<PromptContent>;

  /** Get an evening reflection prompt */
  getEveningPrompt(
    dialScores: Record<DialType, number>,
    morningPrompt: PromptContent | null
  ): Promise<PromptContent>;

  /** Store a new prompt template */
  saveTemplate(template: PromptTemplate): Promise<void>;
}

interface PromptTemplate {
  readonly id: string;
  readonly type: 'morning_kickstart' | 'evening_reflection';
  readonly dialFocus: DialType | null;
  readonly marriageStages: MarriageStage[];
  readonly headline: string;
  readonly bodyTemplate: string;
  readonly actionSuggestionTemplate: string | null;
  readonly weight: number; // For weighted random selection
  readonly active: boolean;
}
```

---

## Domain Services

### EngagementTrackingService

Coordinates the daily engagement lifecycle across aggregates.

```typescript
interface EngagementTrackingService {
  /** Process a morning kickstart delivery and update streak if needed */
  processMorningEngagement(
    userId: UserId,
    date: string,
    timezone: string
  ): Promise<{
    engagement: DailyEngagement;
    streakUpdated: boolean;
    events: DomainEvent[];
  }>;

  /** Process an evening reflection and check for milestone eligibility */
  processEveningReflection(
    userId: UserId,
    date: string,
    response: ReflectionResponse
  ): Promise<{
    engagement: DailyEngagement;
    milestonesEarned: Milestone[];
    events: DomainEvent[];
  }>;

  /** Run nightly job to break stale streaks */
  processStaleStreaks(currentDate: Timestamp): Promise<StreakBroken[]>;
}
```

### MilestoneEvaluationService

Evaluates whether a user qualifies for any unearned milestones based on current state.

```typescript
interface MilestoneEvaluationService {
  /** Evaluate all milestone criteria against current user state */
  evaluateAll(
    userId: UserId,
    context: MilestoneEvaluationContext
  ): Promise<MilestoneType[]>;

  /** Evaluate a specific milestone type */
  evaluate(
    userId: UserId,
    type: MilestoneType,
    context: MilestoneEvaluationContext
  ): Promise<boolean>;
}

interface MilestoneEvaluationContext {
  readonly currentStreak: StreakCount;
  readonly totalReflections: number;
  readonly latestReflection: ReflectionResponse | null;
  readonly communityPostCount: number;
  readonly hasCompletedAssessment: boolean;
  readonly coachingSessionCount: number;
}
```
