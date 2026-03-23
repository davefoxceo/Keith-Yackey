# Shared Kernel

## Overview

The Shared Kernel contains value objects, domain services, and anti-corruption layers that are shared across multiple bounded contexts in the Coach Keith app. These are foundational types and integrations that do not belong to any single context but are depended upon by many.

**Design Principles:**
- Changes to the Shared Kernel require agreement across all consuming contexts
- Shared types are kept minimal -- only truly cross-cutting concerns belong here
- Anti-Corruption Layers (ACLs) isolate external service details from domain logic
- All external integrations are accessed through ACLs, never directly by domain code

---

## Shared Value Objects

```typescript
/** Universally unique user identifier used across all contexts */
interface UserId {
  readonly value: string; // UUID v4
}

/** ISO 8601 timestamp with timezone, used across all contexts */
interface Timestamp {
  readonly value: string; // ISO 8601, e.g., '2026-03-22T14:30:00.000Z'
  readonly epochMs: number; // Milliseconds since Unix epoch
}

/** The Five Dials that are central to Keith's coaching framework */
type DialType =
  | 'emotional_connection' // Emotional intimacy and vulnerability
  | 'physical_intimacy' // Physical affection and sexual connection
  | 'communication' // Quality and depth of communication
  | 'trust_safety' // Trust, reliability, and emotional safety
  | 'shared_vision'; // Aligned goals, dreams, and direction

/** Stage of the user's marriage, used to tailor coaching approach */
type MarriageStage =
  | 'crisis' // Marriage is in serious trouble, immediate intervention needed
  | 'disconnected' // Roommate mode, going through the motions
  | 'rebuilding' // Actively working on repair after conflict or crisis
  | 'stable' // Functional but could be better
  | 'thriving'; // Strong marriage, seeking to deepen further

/** A reference to content that can be used across contexts */
interface ContentReference {
  readonly sourceType: 'podcast' | 'book' | 'framework' | 'video_clip';
  readonly sourceId: string;
  readonly title: string;
  readonly deepLink: string; // In-app deep link to the content
}

/** Generic paginated result wrapper used by all repositories */
interface PaginatedResult<T> {
  readonly items: T[];
  readonly cursor: string | null; // Opaque cursor for next page
  readonly hasMore: boolean;
  readonly totalCount: number | null; // Null when total is expensive to compute
}
```

---

## Domain Services

### CoachingOrchestrationService

Coordinates interactions between the Coaching, Assessment, Content, and Engagement contexts to deliver a cohesive coaching experience.

```typescript
interface CoachingOrchestrationService {
  /**
   * Prepare the full context needed for an AI coaching session.
   * Pulls dial scores from Assessment, engagement history from Engagement,
   * relevant content from Content, and user profile from Identity.
   */
  prepareCoachingContext(userId: UserId): Promise<CoachingContext>;

  /**
   * After a coaching session completes, propagate relevant outcomes
   * to Engagement (coaching activity), Assessment (if dial recalibration
   * was discussed), and Community (if milestone earned).
   */
  processCoachingOutcome(
    userId: UserId,
    sessionId: string,
    outcome: CoachingOutcome
  ): Promise<void>;
}

interface CoachingContext {
  readonly userId: UserId;
  readonly marriageStage: MarriageStage;
  readonly currentDialScores: Record<DialType, number>;
  readonly recentSessionSummaries: string[];
  readonly currentStreak: number;
  readonly relevantFrameworks: ContentReference[];
  readonly entitlementTier: string;
  readonly conversationsRemaining: number;
}

interface CoachingOutcome {
  readonly sessionId: string;
  readonly topicsDiscussed: DialType[];
  readonly frameworksReferenced: string[];
  readonly actionItemsGenerated: string[];
  readonly moodShift: { before: number; after: number } | null;
  readonly milestoneTriggered: string | null;
}
```

### EngagementOrchestrationService

Coordinates daily engagement workflows across Engagement, Assessment, Coaching, and Content contexts.

```typescript
interface EngagementOrchestrationService {
  /**
   * Generate a personalized morning kickstart prompt by pulling
   * dial scores from Assessment, recent coaching topics from Coaching,
   * and relevant content from Content.
   */
  generateMorningKickstart(userId: UserId): Promise<{
    prompt: MorningKickstartPrompt;
    contentReferences: ContentReference[];
  }>;

  /**
   * Process an evening reflection and propagate its effects:
   * - Update engagement streak
   * - Check for milestone eligibility
   * - Feed reflection data back to Assessment for trend analysis
   */
  processEveningReflection(
    userId: UserId,
    response: EveningReflectionInput
  ): Promise<{
    streakUpdated: boolean;
    milestonesEarned: string[];
    suggestedCoachingTopic: DialType | null;
  }>;
}

interface MorningKickstartPrompt {
  readonly headline: string;
  readonly body: string;
  readonly dialFocus: DialType | null;
  readonly actionSuggestion: string | null;
  readonly contentReference: ContentReference | null;
}

interface EveningReflectionInput {
  readonly winOfTheDay: string;
  readonly challengeOfTheDay: string | null;
  readonly intentionForTomorrow: string;
  readonly moodRating: 1 | 2 | 3 | 4 | 5;
  readonly dialAdjustments: { dial: DialType; direction: 'improved' | 'declined' | 'same' }[];
}
```

### ContentRecommendationService

Cross-context service that recommends content based on coaching history, assessment scores, and engagement patterns.

```typescript
interface ContentRecommendationService {
  /**
   * Recommend content for a user based on their current state across contexts.
   * Used by Coaching (RAG context), Engagement (prompt content references),
   * and the Content library browse experience.
   */
  recommend(
    userId: UserId,
    context: RecommendationContext
  ): Promise<ContentRecommendation[]>;

  /**
   * Record that a user interacted with recommended content (for learning).
   */
  recordInteraction(
    userId: UserId,
    contentRef: ContentReference,
    interactionType: 'viewed' | 'completed' | 'saved' | 'shared'
  ): Promise<void>;
}

interface RecommendationContext {
  readonly trigger: 'coaching_session' | 'daily_engagement' | 'browse' | 'search';
  readonly dialFocus?: DialType;
  readonly marriageStage?: MarriageStage;
  readonly recentTopics?: string[];
  readonly excludeContentIds?: string[];
  readonly limit: number;
}

interface ContentRecommendation {
  readonly contentRef: ContentReference;
  readonly relevanceScore: number;
  readonly reason: string; // Human-readable reason for the recommendation
  readonly dialRelevance: DialType[];
}
```

### FeatureGateService

Central feature gating service that checks entitlements before allowing access to features.

```typescript
interface FeatureGateService {
  /**
   * Check if a user has access to a specific feature.
   * Reads from the Subscription context's Entitlement aggregate.
   */
  checkAccess(userId: UserId, feature: string): Promise<FeatureGateResult>;

  /**
   * Check multiple features at once (batch optimization).
   */
  checkAccessBatch(
    userId: UserId,
    features: string[]
  ): Promise<Record<string, FeatureGateResult>>;

  /**
   * Get the full entitlement set for a user (for rendering UI).
   */
  getEntitlements(userId: UserId): Promise<UserEntitlements>;
}

interface FeatureGateResult {
  readonly allowed: boolean;
  readonly reason: 'entitled' | 'trial' | 'not_entitled' | 'limit_reached' | 'subscription_expired';
  readonly upgradeRequired: boolean;
  readonly suggestedTier: string | null;
  readonly remainingUsage: number | null; // For metered features like conversations
}

interface UserEntitlements {
  readonly userId: UserId;
  readonly tier: string;
  readonly features: Record<string, boolean>;
  readonly limits: Record<string, { used: number; max: number }>;
  readonly expiresAt: Timestamp;
}
```

---

## Anti-Corruption Layers

Anti-Corruption Layers translate between external service APIs and internal domain models. Each ACL is the only code that knows about the external service's data structures and protocols.

### Claude API ACL

Isolates the Anthropic Claude API integration from the Coaching domain. The Coaching context works with domain concepts; this ACL translates to/from Claude API calls.

```typescript
interface ClaudeApiAcl {
  /**
   * Send a coaching message and receive a response.
   * Translates domain CoachingContext into Claude API system prompts,
   * manages conversation threading, and parses structured responses.
   */
  sendCoachingMessage(
    conversationHistory: ConversationMessage[],
    systemContext: CoachingSystemContext,
    userMessage: string,
    options?: ClaudeRequestOptions
  ): Promise<CoachingResponse>;

  /**
   * Generate content analysis (for transcript post-processing, moderation, etc.)
   */
  analyzeContent(
    content: string,
    analysisType: 'moderation' | 'framework_extraction' | 'topic_tagging' | 'transcript_correction'
  ): Promise<ContentAnalysisResult>;

  /**
   * Generate embedding-adjacent text analysis (for content matching).
   * Note: Actual embeddings use the Embedding Service ACL.
   */
  summarizeForEmbedding(content: string): Promise<string>;
}

interface CoachingSystemContext {
  readonly coachPersona: string; // Keith's voice and coaching style
  readonly userProfile: {
    readonly marriageStage: MarriageStage;
    readonly dialScores: Record<DialType, number>;
    readonly recentTopics: string[];
    readonly engagementStreak: number;
  };
  readonly ragContext: string[]; // Retrieved content chunks
  readonly frameworks: string[]; // Available frameworks
  readonly guidelines: string[]; // Coaching guardrails and boundaries
}

interface ClaudeRequestOptions {
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly model?: string; // Allow model override for different use cases
}

interface CoachingResponse {
  readonly message: string;
  readonly suggestedActions: string[];
  readonly dialReferences: DialType[];
  readonly frameworksUsed: string[];
  readonly shouldFollowUp: boolean;
  readonly tokensUsed: { input: number; output: number };
}

interface ContentAnalysisResult {
  readonly analysisType: string;
  readonly result: Record<string, unknown>;
  readonly confidence: number;
}

interface ConversationMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: Timestamp;
}
```

### App Store Billing ACL

Isolates Apple App Store and Google Play Store billing APIs from the Subscription domain.

```typescript
interface AppStoreBillingAcl {
  /**
   * Verify a purchase receipt with the appropriate app store.
   * Returns a normalized receipt result regardless of platform.
   */
  verifyReceipt(
    platform: 'apple_app_store' | 'google_play_store',
    receiptToken: string
  ): Promise<ReceiptVerificationResult>;

  /**
   * Process a server-to-server notification from the app store
   * (renewal, cancellation, billing issue, etc.)
   */
  parseStoreNotification(
    platform: 'apple_app_store' | 'google_play_store',
    rawNotification: unknown
  ): Promise<StoreNotification>;

  /**
   * Get the current subscription status from the store.
   */
  getSubscriptionStatus(
    platform: 'apple_app_store' | 'google_play_store',
    originalTransactionId: string
  ): Promise<StoreSubscriptionStatus>;
}

interface ReceiptVerificationResult {
  readonly isValid: boolean;
  readonly transactionId: string;
  readonly productId: string;
  readonly purchaseDate: Timestamp;
  readonly expiresDate: Timestamp | null;
  readonly isTrialPeriod: boolean;
  readonly autoRenewing: boolean;
  readonly cancellationDate: Timestamp | null;
  readonly rawResponse: unknown; // Platform-specific response for debugging
}

interface StoreNotification {
  readonly type: 'renewal' | 'cancellation' | 'billing_issue' | 'refund' | 'price_change' | 'revocation';
  readonly transactionId: string;
  readonly productId: string;
  readonly occurredAt: Timestamp;
  readonly metadata: Record<string, unknown>;
}

interface StoreSubscriptionStatus {
  readonly isActive: boolean;
  readonly expiresDate: Timestamp;
  readonly autoRenewing: boolean;
  readonly inBillingRetryPeriod: boolean;
  readonly inGracePeriod: boolean;
  readonly productId: string;
}
```

### AssemblyAI ACL

Isolates the AssemblyAI transcription service from the Content domain.

```typescript
interface AssemblyAiAcl {
  /**
   * Submit an audio file for transcription.
   * Returns a job ID for polling.
   */
  submitTranscription(
    audioUrl: string,
    options?: TranscriptionOptions
  ): Promise<{ jobId: string; estimatedDurationMs: number }>;

  /**
   * Check the status of a transcription job.
   */
  getJobStatus(jobId: string): Promise<TranscriptionJobStatus>;

  /**
   * Retrieve the completed transcription result.
   * Normalizes AssemblyAI's response format into domain types.
   */
  getTranscriptionResult(jobId: string): Promise<NormalizedTranscript>;
}

interface TranscriptionOptions {
  readonly speakerLabels: boolean; // Enable speaker diarization
  readonly languageCode: string;
  readonly punctuate: boolean;
  readonly formatText: boolean;
  readonly webhookUrl?: string; // For completion callbacks
}

interface TranscriptionJobStatus {
  readonly jobId: string;
  readonly status: 'queued' | 'processing' | 'completed' | 'error';
  readonly percentComplete: number;
  readonly error: string | null;
}

interface NormalizedTranscript {
  readonly fullText: string;
  readonly confidence: number;
  readonly segments: {
    readonly speaker: string;
    readonly text: string;
    readonly startTimeMs: number;
    readonly endTimeMs: number;
    readonly confidence: number;
    readonly words: {
      readonly text: string;
      readonly startTimeMs: number;
      readonly endTimeMs: number;
      readonly confidence: number;
    }[];
  }[];
  readonly durationMs: number;
}
```

### Embedding Service ACL

Isolates the vector embedding generation service (e.g., OpenAI embeddings API) from the Content domain.

```typescript
interface EmbeddingServiceAcl {
  /**
   * Generate an embedding vector for a text chunk.
   */
  generateEmbedding(
    text: string,
    model?: string
  ): Promise<EmbeddingResult>;

  /**
   * Generate embeddings for multiple text chunks in a batch.
   */
  generateEmbeddingBatch(
    texts: string[],
    model?: string
  ): Promise<EmbeddingResult[]>;

  /**
   * Get information about the current embedding model.
   */
  getModelInfo(): Promise<{
    model: string;
    dimensions: number;
    maxTokens: number;
  }>;
}

interface EmbeddingResult {
  readonly vector: number[];
  readonly dimensions: number;
  readonly model: string;
  readonly tokensUsed: number;
}
```

### Push Notification ACL

Isolates push notification delivery (APNs, FCM) from domain contexts.

```typescript
interface PushNotificationAcl {
  /**
   * Send a push notification to a user's device(s).
   */
  sendNotification(
    userId: UserId,
    notification: PushNotificationPayload
  ): Promise<PushDeliveryResult>;

  /**
   * Send a batch of notifications.
   */
  sendBatch(
    notifications: { userId: UserId; payload: PushNotificationPayload }[]
  ): Promise<PushDeliveryResult[]>;

  /**
   * Register a device token for a user.
   */
  registerDevice(
    userId: UserId,
    platform: 'ios' | 'android',
    deviceToken: string
  ): Promise<void>;

  /**
   * Unregister a device token.
   */
  unregisterDevice(userId: UserId, deviceToken: string): Promise<void>;
}

interface PushNotificationPayload {
  readonly title: string;
  readonly body: string;
  readonly category: 'morning_kickstart' | 'evening_reflection' | 'coaching' | 'community' | 'milestone' | 'subscription' | 'live_event';
  readonly deepLink: string | null;
  readonly badge: number | null;
  readonly sound: string | null;
  readonly data: Record<string, unknown>;
}

interface PushDeliveryResult {
  readonly userId: UserId;
  readonly delivered: boolean;
  readonly deviceCount: number;
  readonly failedDevices: string[];
  readonly error: string | null;
}
```

### Audio Room ACL

Isolates the live audio room service (for live events with Keith) from the LiveEvents domain.

```typescript
interface AudioRoomAcl {
  /**
   * Create a new audio room for a live event.
   */
  createRoom(config: AudioRoomConfig): Promise<AudioRoomHandle>;

  /**
   * Join a user to an existing audio room.
   */
  joinRoom(roomId: string, userId: UserId, role: 'host' | 'speaker' | 'listener'): Promise<JoinResult>;

  /**
   * Remove a user from a room.
   */
  removeFromRoom(roomId: string, userId: UserId): Promise<void>;

  /**
   * Start recording a room.
   */
  startRecording(roomId: string): Promise<{ recordingId: string }>;

  /**
   * Stop recording and get the recording URL.
   */
  stopRecording(roomId: string, recordingId: string): Promise<{ recordingUrl: string; durationMs: number }>;

  /**
   * Close a room and disconnect all participants.
   */
  closeRoom(roomId: string): Promise<void>;

  /**
   * Get current room status and participant count.
   */
  getRoomStatus(roomId: string): Promise<RoomStatus>;
}

interface AudioRoomConfig {
  readonly maxParticipants: number;
  readonly enableRecording: boolean;
  readonly enableChat: boolean;
  readonly enableHandRaise: boolean;
  readonly scheduledStartTime: Timestamp;
  readonly title: string;
}

interface AudioRoomHandle {
  readonly roomId: string;
  readonly joinUrl: string;
  readonly hostToken: string;
  readonly createdAt: Timestamp;
}

interface JoinResult {
  readonly participantToken: string;
  readonly role: 'host' | 'speaker' | 'listener';
  readonly currentParticipantCount: number;
}

interface RoomStatus {
  readonly roomId: string;
  readonly isActive: boolean;
  readonly participantCount: number;
  readonly isRecording: boolean;
  readonly startedAt: Timestamp | null;
  readonly durationMs: number;
}
```
