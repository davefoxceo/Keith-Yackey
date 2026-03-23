# Identity Bounded Context

## 1. Overview

The **Identity** context is the authoritative source of truth for user identity, profile data, onboarding state, preferences, and privacy controls within the Coach Keith AI platform. Every other bounded context depends on Identity for user identification and basic profile data.

### Responsibilities

- User registration and authentication lifecycle
- Onboarding flow management (initial assessment, marriage context collection)
- Profile creation and maintenance
- User preference management (notifications, privacy, anonymity)
- Marriage context storage (duration, stage, relationship metadata)
- GDPR/CCPA compliance: data export and deletion
- Account deactivation and reactivation

### Key Design Decisions

- **UserProfile is the sole aggregate.** All user-related data (preferences, onboarding, marriage context) lives within the UserProfile boundary to ensure transactional consistency.
- **Onboarding is an entity, not a separate aggregate.** Onboarding is a one-time flow that produces data owned by the UserProfile. It does not have an independent lifecycle.
- **Value objects enforce domain constraints at construction time.** An `EmailAddress` that does not pass validation cannot exist.
- **Privacy is a first-class concern.** Anonymity preferences, data export, and data deletion are explicit domain operations, not afterthoughts.

---

## 2. Aggregates

### 2.1 UserProfile (Aggregate Root)

The UserProfile aggregate encapsulates everything the platform knows about a user's identity, their onboarding journey, their preferences, and their marriage context.

**Invariants:**
- A UserProfile must have a valid, unique `email`.
- `displayName` must be between 2 and 50 characters.
- `onboarding` must be completed before the user can access Coaching, Assessment, or Community features.
- A deactivated account cannot be modified (except for reactivation or data deletion).
- `marriageContext` is required after onboarding completion.
- `preferences` must always exist with sensible defaults.

```typescript
interface UserProfile {
  /** Globally unique user identifier */
  id: UserId;

  /** User's email address (unique across the platform) */
  email: EmailAddress;

  /** The name displayed in the app and community */
  displayName: DisplayName;

  /** URL to the user's avatar image (optional) */
  avatarUrl: string | null;

  /** Onboarding assessment state and responses */
  onboarding: OnboardingAssessment;

  /** User-configurable preferences */
  preferences: UserPreferences;

  /** Marriage-specific context gathered during onboarding and updated over time */
  marriageContext: MarriageContext | null;

  /** Account status */
  status: 'active' | 'deactivated' | 'suspended' | 'pending_deletion';

  /** Authentication provider */
  authProvider: 'email' | 'apple' | 'google';

  /** External auth provider ID (null for email auth) */
  externalAuthId: string | null;

  /** ISO 8601 */
  createdAt: string;

  /** ISO 8601 */
  updatedAt: string;

  /** ISO 8601, null if never deactivated */
  deactivatedAt: string | null;

  /** Timestamp of last login */
  lastLoginAt: string | null;

  /** App version at last login */
  lastAppVersion: string | null;

  /** Platform at last login */
  lastPlatform: 'ios' | 'android' | null;

  /** Timezone identifier (e.g., "America/Denver") */
  timezone: string;
}
```

---

## 3. Entities

### 3.1 OnboardingAssessment

Tracks the user's progress through the onboarding flow and stores their responses. Onboarding is a multi-step process that collects marriage context, initial Five Dials self-assessment, and communication preferences.

```typescript
interface OnboardingAssessment {
  /** Unique identifier for this onboarding instance */
  id: string;

  /** Current step in the onboarding flow */
  currentStep: number;

  /** Total number of steps */
  totalSteps: number;

  /** Whether onboarding has been completed */
  completed: boolean;

  /** ISO 8601 timestamp of completion (null if incomplete) */
  completedAt: string | null;

  /** All responses collected during onboarding, keyed by question ID */
  responses: OnboardingResponse[];

  /** The marriage stage derived from onboarding responses */
  derivedMarriageStage: MarriageStage | null;

  /** Initial self-reported dial scores from onboarding */
  initialDialScores: {
    parent: number;
    partner: number;
    producer: number;
    player: number;
    power: number;
  } | null;

  /** ISO 8601 */
  startedAt: string;

  /** ISO 8601 */
  lastUpdatedAt: string;

  /** Version of the onboarding flow (for A/B testing and migration) */
  flowVersion: string;
}
```

### 3.2 UserPreferences

User-configurable settings that affect behavior across multiple contexts.

```typescript
interface UserPreferences {
  /** Unique identifier */
  id: string;

  /** Notification preferences */
  notifications: {
    /** Whether push notifications are enabled */
    pushEnabled: boolean;

    /** Whether email notifications are enabled */
    emailEnabled: boolean;

    /** Specific notification schedule */
    schedule: NotificationSchedule;

    /** Types of notifications the user wants */
    enabledTypes: Array<
      | 'daily_checkin'
      | 'streak_reminder'
      | 'coaching_followup'
      | 'community_activity'
      | 'content_recommendation'
      | 'challenge_reminder'
      | 'live_event'
    >;
  };

  /** Community and privacy preferences */
  privacy: {
    /** How the user appears in the Brotherhood community */
    anonymity: AnonymityPreference;

    /** Whether the user's progress is visible to Brotherhood members */
    shareProgress: boolean;

    /** Whether the user appears in leaderboards */
    showInLeaderboards: boolean;
  };

  /** Coaching preferences */
  coaching: {
    /** Preferred coaching tone */
    preferredTone: 'direct' | 'empathetic' | 'balanced';

    /** Topics the user wants to focus on */
    focusAreas: string[];

    /** Topics the user has marked as off-limits */
    avoidTopics: string[];
  };

  /** ISO 8601 */
  updatedAt: string;
}
```

### 3.3 MarriageContext

Stores the user's marriage-specific information, gathered during onboarding and refined over time through coaching interactions.

```typescript
interface MarriageContext {
  /** Unique identifier */
  id: string;

  /** How long the user has been married */
  marriageDuration: MarriageDuration;

  /** Whether children are involved */
  hasChildren: boolean;

  /** Number of children (null if hasChildren is false) */
  numberOfChildren: number | null;

  /** Age ranges of children */
  childrenAgeRanges: Array<'infant' | 'toddler' | 'school_age' | 'teenager' | 'adult'>;

  /** Current marriage stage classification */
  marriageStage: MarriageStage;

  /** Whether the couple is currently in professional counseling */
  inCounseling: boolean;

  /** Whether separation or divorce is being discussed */
  separationDiscussed: boolean;

  /** Key challenges identified during onboarding */
  primaryChallenges: string[];

  /** What the user hopes to achieve */
  goals: string[];

  /** ISO 8601 */
  updatedAt: string;
}
```

---

## 4. Value Objects

### 4.1 UserId

```typescript
interface UserId {
  /** UUID v4 string */
  readonly value: string;
}
```

**Constraints:** Must be a valid UUID v4. Immutable after creation.

### 4.2 EmailAddress

```typescript
interface EmailAddress {
  /** Normalized email address (lowercase, trimmed) */
  readonly value: string;
}
```

**Constraints:** Must pass RFC 5322 validation. Always stored lowercase. Maximum 254 characters.

### 4.3 DisplayName

```typescript
interface DisplayName {
  /** The display name string */
  readonly value: string;
}
```

**Constraints:** 2-50 characters. No leading/trailing whitespace. No special characters except hyphens, apostrophes, and periods. Profanity-filtered.

### 4.4 NotificationSchedule

```typescript
interface NotificationSchedule {
  /** Days of the week notifications are allowed */
  readonly activeDays: Array<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>;

  /** Earliest time notifications can be sent (HH:mm, user's local time) */
  readonly quietHoursStart: string;

  /** Latest time notifications can be sent (HH:mm, user's local time) */
  readonly quietHoursEnd: string;

  /** Preferred daily check-in time (HH:mm, user's local time) */
  readonly preferredCheckinTime: string;
}
```

### 4.5 MarriageDuration

```typescript
interface MarriageDuration {
  /** Full years married */
  readonly years: number;

  /** Additional months beyond full years */
  readonly months: number;
}
```

**Constraints:** `years` >= 0, `months` 0-11. Total duration must be >= 0.

### 4.6 OnboardingResponse

```typescript
interface OnboardingResponse {
  /** The question identifier */
  readonly questionId: string;

  /** The step number this question belongs to */
  readonly stepNumber: number;

  /** The question text (for auditability) */
  readonly questionText: string;

  /** The user's response */
  readonly answer: string | number | boolean | string[];

  /** The type of input used */
  readonly inputType: 'text' | 'number' | 'slider' | 'single_choice' | 'multi_choice' | 'boolean';

  /** ISO 8601 timestamp of when the response was recorded */
  readonly answeredAt: string;
}
```

### 4.7 MarriageStage

```typescript
interface MarriageStage {
  /** The stage classification */
  readonly stage: 'honeymoon' | 'disillusionment' | 'misery' | 'awakening' | 'transformation';

  /** How this stage was determined */
  readonly source: 'onboarding_self_report' | 'onboarding_derived' | 'ai_reclassification';

  /** Confidence in the classification (0.0 to 1.0) */
  readonly confidence: number;

  /** ISO 8601 timestamp of classification */
  readonly classifiedAt: string;
}
```

### 4.8 AnonymityPreference

```typescript
interface AnonymityPreference {
  /** The anonymity level */
  readonly level: 'full_name' | 'first_name_only' | 'anonymous' | 'custom_alias';

  /** Custom alias if level is 'custom_alias' */
  readonly customAlias: string | null;
}
```

**Constraints:** If `level` is `custom_alias`, `customAlias` must be non-null, 2-30 characters, and profanity-filtered. If `level` is not `custom_alias`, `customAlias` must be null.

---

## 5. Domain Events

### 5.1 UserRegistered

Published when a new user account is created.

```typescript
interface UserRegistered {
  eventType: 'UserRegistered';
  userId: string;
  email: string;
  authProvider: 'email' | 'apple' | 'google';
  platform: 'ios' | 'android';
  appVersion: string;
  timestamp: string;
}
```

### 5.2 OnboardingCompleted

Published when the user finishes all onboarding steps. This is a critical event that unlocks access to Coaching and Assessment contexts.

```typescript
interface OnboardingCompleted {
  eventType: 'OnboardingCompleted';
  userId: string;
  onboardingId: string;
  derivedMarriageStage: MarriageStage;
  initialDialScores: {
    parent: number;
    partner: number;
    producer: number;
    player: number;
    power: number;
  };
  flowVersion: string;
  durationSeconds: number;
  timestamp: string;
}
```

### 5.3 ProfileUpdated

Published when any profile field changes (display name, avatar, timezone, etc.).

```typescript
interface ProfileUpdated {
  eventType: 'ProfileUpdated';
  userId: string;
  changedFields: string[];
  timestamp: string;
}
```

### 5.4 PreferencesChanged

Published when the user modifies their preferences.

```typescript
interface PreferencesChanged {
  eventType: 'PreferencesChanged';
  userId: string;
  changedCategories: Array<'notifications' | 'privacy' | 'coaching'>;
  timestamp: string;
}
```

### 5.5 AccountDeactivated

Published when a user deactivates their account. The account remains in the database but is inaccessible.

```typescript
interface AccountDeactivated {
  eventType: 'AccountDeactivated';
  userId: string;
  reason: string | null;
  timestamp: string;
}
```

### 5.6 DataExportRequested

Published when the user requests a full export of their data (GDPR/CCPA right of access).

```typescript
interface DataExportRequested {
  eventType: 'DataExportRequested';
  userId: string;
  requestId: string;
  format: 'json' | 'csv';
  timestamp: string;
}
```

### 5.7 DataDeletionRequested

Published when the user requests permanent deletion of all their data (GDPR right to erasure). This triggers a cascade across all bounded contexts.

```typescript
interface DataDeletionRequested {
  eventType: 'DataDeletionRequested';
  userId: string;
  requestId: string;
  /** Grace period in days before deletion is executed (allows cancellation) */
  gracePeriodDays: number;
  /** ISO 8601 date when deletion will be executed */
  scheduledDeletionDate: string;
  timestamp: string;
}
```

---

## 6. Repositories

### 6.1 UserProfileRepository

```typescript
interface UserProfileRepository {
  /** Persist a new or updated user profile */
  save(profile: UserProfile): Promise<void>;

  /** Find by unique user ID */
  findById(userId: UserId): Promise<UserProfile | null>;

  /** Find by email address */
  findByEmail(email: EmailAddress): Promise<UserProfile | null>;

  /** Find by external auth provider ID */
  findByExternalAuthId(
    provider: 'apple' | 'google',
    externalId: string
  ): Promise<UserProfile | null>;

  /** Check if an email is already registered */
  emailExists(email: EmailAddress): Promise<boolean>;

  /** Update account status */
  updateStatus(
    userId: UserId,
    status: 'active' | 'deactivated' | 'suspended' | 'pending_deletion'
  ): Promise<void>;

  /** Find users scheduled for deletion (past grace period) */
  findPendingDeletion(): Promise<UserProfile[]>;

  /** Permanently delete all user data */
  hardDelete(userId: UserId): Promise<void>;

  /** Find users who have not logged in within a given period */
  findInactiveUsers(inactiveSinceDays: number): Promise<UserProfile[]>;
}
```

### 6.2 OnboardingRepository

```typescript
interface OnboardingRepository {
  /** Persist onboarding state */
  save(onboarding: OnboardingAssessment & { userId: string }): Promise<void>;

  /** Find the onboarding record for a user */
  findByUserId(userId: string): Promise<OnboardingAssessment | null>;

  /** Get aggregate onboarding analytics (for product team) */
  getCompletionStats(flowVersion: string): Promise<{
    totalStarted: number;
    totalCompleted: number;
    averageDurationSeconds: number;
    dropOffByStep: Record<number, number>;
  }>;

  /** Find incomplete onboardings older than a threshold (for re-engagement) */
  findIncomplete(olderThanDays: number): Promise<Array<{
    userId: string;
    currentStep: number;
    lastUpdatedAt: string;
  }>>;
}
```

---

## 7. Domain Services

### 7.1 RegistrationService

Handles the user registration flow, including validation, duplicate detection, and event publishing.

```typescript
interface RegistrationService {
  /** Register a new user with email/password */
  registerWithEmail(
    email: string,
    displayName: string,
    timezone: string,
    platform: 'ios' | 'android',
    appVersion: string
  ): Promise<{ profile: UserProfile; events: DomainEvent[] }>;

  /** Register or link via social auth provider */
  registerWithSocialAuth(
    provider: 'apple' | 'google',
    externalId: string,
    email: string,
    displayName: string,
    timezone: string,
    platform: 'ios' | 'android',
    appVersion: string
  ): Promise<{ profile: UserProfile; isNewUser: boolean; events: DomainEvent[] }>;
}
```

### 7.2 OnboardingService

Manages the multi-step onboarding flow.

```typescript
interface OnboardingService {
  /** Initialize onboarding for a new user */
  startOnboarding(userId: string, flowVersion: string): Promise<OnboardingAssessment>;

  /** Submit a response for a specific onboarding step */
  submitStepResponse(
    userId: string,
    stepNumber: number,
    responses: OnboardingResponse[]
  ): Promise<{ onboarding: OnboardingAssessment; events: DomainEvent[] }>;

  /** Complete onboarding and derive marriage stage + initial dial scores */
  completeOnboarding(
    userId: string
  ): Promise<{ profile: UserProfile; events: DomainEvent[] }>;

  /** Get the current onboarding state for a user */
  getOnboardingState(userId: string): Promise<OnboardingAssessment | null>;
}
```

### 7.3 DataPrivacyService

Handles GDPR/CCPA data operations.

```typescript
interface DataPrivacyService {
  /** Generate a full data export for a user */
  exportUserData(userId: string, format: 'json' | 'csv'): Promise<{
    downloadUrl: string;
    expiresAt: string;
    events: DomainEvent[];
  }>;

  /** Request data deletion with grace period */
  requestDeletion(userId: string): Promise<{
    scheduledDeletionDate: string;
    events: DomainEvent[];
  }>;

  /** Cancel a pending deletion request */
  cancelDeletion(userId: string): Promise<{ events: DomainEvent[] }>;

  /** Execute deletion (called by scheduled job after grace period) */
  executeDeletion(userId: string): Promise<{ events: DomainEvent[] }>;
}
```
