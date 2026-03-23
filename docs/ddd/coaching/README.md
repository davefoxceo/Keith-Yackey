# Coaching Bounded Context

## 1. Overview

The **Coaching** context is the core domain of the Coach Keith AI platform. It manages all AI-powered conversational coaching interactions between users and the Claude-based AI coach persona ("Coach Keith"). This context is responsible for:

- Managing multi-turn conversations with full history
- Routing conversations through distinct modes (free chat, crisis, framework-guided, accountability)
- Classifying the user's marriage stage and adapting tone and guidance accordingly
- Detecting crisis situations and escalating appropriately
- Integrating RAG (Retrieval-Augmented Generation) with content from the Content context
- Suggesting Five Dials adjustments to the Assessment context based on conversational signals
- Generating conversation summaries for long-term context retention

### Key Design Decisions

- **Conversation is the primary aggregate.** All messages, mode transitions, and AI responses live within a Conversation boundary.
- **CoachingSession tracks a single sitting.** A user may have many sessions within one conversation (e.g., returning to the same topic days later).
- **Safety-first architecture.** Every AI response passes through a safety check before delivery. Crisis detection is a first-class domain concern.
- **RAG is a value object, not an entity.** Retrieved context is ephemeral and reconstructed per request.

---

## 2. Aggregates

### 2.1 Conversation (Aggregate Root)

The Conversation aggregate is the central unit of work. It encapsulates the full history of a coaching interaction, including all messages, mode transitions, and generated summaries.

**Invariants:**
- A Conversation must belong to exactly one user (`userId`).
- A Conversation must have at least one message to be considered started.
- The current `mode` must be a valid `ConversationModeType`.
- When a crisis is detected, the conversation mode MUST transition to `Crisis` immediately.
- A Conversation may only be summarized when it contains at least 5 messages.
- A closed Conversation cannot accept new messages.

```typescript
interface Conversation {
  /** Unique identifier for this conversation */
  id: string;

  /** The user who owns this conversation */
  userId: string;

  /** Human-readable title, auto-generated or user-supplied */
  title: string;

  /** Current conversation mode */
  currentMode: ConversationModeType;

  /** Classification of the user's marriage stage at conversation start */
  marriageStage: MarriageStageClassification;

  /** Ordered list of all messages in this conversation */
  messages: Message[];

  /** Active coaching sessions within this conversation */
  sessions: CoachingSession[];

  /** Summary generated from conversation history (null if not yet summarized) */
  summary: string | null;

  /** Whether the conversation is still accepting messages */
  status: 'active' | 'closed' | 'archived';

  /** ISO 8601 timestamp */
  createdAt: string;

  /** ISO 8601 timestamp */
  updatedAt: string;

  /** Metadata for AI context windowing */
  tokenCount: number;

  /** Maximum token budget before summarization is triggered */
  maxTokenBudget: number;
}
```

### 2.2 CoachingSession (Aggregate Root)

A CoachingSession represents a single contiguous coaching interaction (one "sitting"). A user opens the app, chats for a while, and closes it -- that is one session. Sessions are linked to a Conversation but tracked independently for analytics and engagement purposes.

**Invariants:**
- A session must reference a valid `conversationId`.
- `endedAt` must be after `startedAt` (when set).
- A session cannot be ended if it was never started.
- `messageCount` must equal the number of messages sent during this session window.

```typescript
interface CoachingSession {
  /** Unique session identifier */
  id: string;

  /** The conversation this session belongs to */
  conversationId: string;

  /** The user */
  userId: string;

  /** Mode at session start */
  initialMode: ConversationModeType;

  /** All modes used during the session (for analytics) */
  modesUsed: ConversationModeType[];

  /** ISO 8601 */
  startedAt: string;

  /** ISO 8601, null if session is still active */
  endedAt: string | null;

  /** Number of user messages sent in this session */
  messageCount: number;

  /** Duration in seconds */
  durationSeconds: number | null;

  /** Session-level sentiment trajectory */
  sentimentArc: Array<{ timestamp: string; score: number }>;
}
```

---

## 3. Entities

### 3.1 Message

A single message within a conversation. Messages are either from the user or the AI coach.

```typescript
interface Message {
  /** Unique message identifier */
  id: string;

  /** Parent conversation */
  conversationId: string;

  /** Who sent this message */
  role: 'user' | 'assistant' | 'system';

  /** The message content */
  content: MessageContent;

  /** The conversation mode at the time this message was sent */
  modeAtTime: ConversationModeType;

  /** If role is 'assistant', the full AI response metadata */
  aiResponse: AIResponse | null;

  /** Safety check result (always present for assistant messages) */
  safetyCheck: SafetyCheckResult | null;

  /** ISO 8601 */
  createdAt: string;

  /** Sequence number within the conversation (1-based) */
  sequenceNumber: number;
}
```

### 3.2 ConversationMode

Tracks mode transitions within a conversation. Each transition is recorded as an entity for auditability.

```typescript
interface ConversationMode {
  /** Unique identifier for this mode record */
  id: string;

  /** The conversation this mode belongs to */
  conversationId: string;

  /** The mode type */
  mode: ConversationModeType;

  /** Why the mode changed */
  reason: string;

  /** Who or what triggered the change */
  triggeredBy: 'user' | 'ai_detection' | 'system';

  /** ISO 8601 when this mode became active */
  activatedAt: string;

  /** ISO 8601 when this mode was replaced (null if current) */
  deactivatedAt: string | null;
}
```

### 3.3 UserContext

A read-model projection of relevant user data from the Identity and Assessment contexts, used to inform AI responses. Rebuilt at conversation start and refreshed periodically.

```typescript
interface UserContext {
  /** The user's ID (from Identity context) */
  userId: string;

  /** Display name for personalization */
  displayName: string;

  /** Current marriage stage classification */
  marriageStage: MarriageStageClassification;

  /** Latest Five Dials scores (from Assessment context) */
  currentDialScores: {
    parent: number;
    partner: number;
    producer: number;
    player: number;
    power: number;
  };

  /** How long the user has been married */
  marriageDuration: { years: number; months: number };

  /** Topics the user has flagged as sensitive */
  sensitiveTopics: string[];

  /** Number of previous conversations */
  conversationCount: number;

  /** Key themes from previous conversation summaries */
  previousThemes: string[];

  /** Active micro-challenges from Assessment */
  activeChallenges: Array<{ id: string; description: string; dueDate: string }>;

  /** Last refreshed timestamp */
  refreshedAt: string;
}
```

---

## 4. Value Objects

### 4.1 MessageContent

```typescript
interface MessageContent {
  /** The textual body of the message */
  text: string;

  /** Optional structured data attached to the message (e.g., a dial chart, a framework card) */
  attachments: Array<{
    type: 'dial_snapshot' | 'framework_card' | 'content_link' | 'challenge_card';
    payload: Record<string, unknown>;
  }>;

  /** Detected sentiment score (-1.0 to 1.0) */
  sentiment: number | null;

  /** Detected emotional tone labels */
  emotionalTones: string[];
}
```

### 4.2 ConversationModeType

```typescript
type ConversationModeType =
  | 'FreeChat'         // Open-ended coaching conversation
  | 'Crisis'           // Detected crisis -- safety protocols active, empathetic responses, resource provision
  | 'Framework'        // Guided conversation using a specific Keith Yackey framework (e.g., Five Dials walkthrough)
  | 'Accountability';  // Follow-up on commitments, micro-challenges, and progress review
```

### 4.3 MarriageStageClassification

```typescript
interface MarriageStageClassification {
  /** The classified stage */
  stage: 'honeymoon' | 'disillusionment' | 'misery' | 'awakening' | 'transformation';

  /** Confidence score (0.0 to 1.0) */
  confidence: number;

  /** Supporting evidence from conversation or onboarding */
  evidence: string[];

  /** When this classification was made or last updated */
  classifiedAt: string;
}
```

### 4.4 AIResponse

```typescript
interface AIResponse {
  /** The raw response from Claude API */
  rawText: string;

  /** The post-processed, safety-checked response delivered to the user */
  deliveredText: string;

  /** Claude model identifier used */
  model: string;

  /** Tokens consumed (input + output) */
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  };

  /** The prompt template used */
  promptTemplate: PromptTemplate;

  /** RAG context injected into the prompt */
  ragContext: RAGContext | null;

  /** Latency in milliseconds */
  latencyMs: number;

  /** Any suggested dial adjustments derived from this response */
  suggestedDialAdjustments: SuggestedDialAdjustment[];

  /** Content recommendations generated */
  contentRecommendations: ContentRecommendation[];

  /** Unique request ID for tracing */
  requestId: string;
}
```

### 4.5 PromptTemplate

```typescript
interface PromptTemplate {
  /** Template identifier (e.g., "coaching_v3_crisis") */
  id: string;

  /** Template version */
  version: string;

  /** The conversation mode this template is designed for */
  targetMode: ConversationModeType;

  /** System prompt text (with placeholder tokens) */
  systemPrompt: string;

  /** Variables injected into the template */
  variables: Record<string, string>;
}
```

### 4.6 RAGContext

```typescript
interface RAGContext {
  /** Retrieved content chunks used to augment the AI prompt */
  chunks: Array<{
    /** Source content identifier (episode ID, ebook section, etc.) */
    sourceId: string;

    /** Source type */
    sourceType: 'podcast_transcript' | 'ebook_section' | 'framework_doc' | 'faq';

    /** The text chunk */
    text: string;

    /** Cosine similarity score */
    relevanceScore: number;

    /** Human-readable source label */
    sourceLabel: string;
  }>;

  /** The user query or conversation context used to perform retrieval */
  queryText: string;

  /** Total chunks considered before top-k selection */
  totalCandidates: number;

  /** Number of chunks selected */
  selectedCount: number;
}
```

### 4.7 SafetyCheckResult

```typescript
interface SafetyCheckResult {
  /** Whether the response passed all safety checks */
  passed: boolean;

  /** Individual check results */
  checks: Array<{
    checkName: 'crisis_language' | 'harmful_advice' | 'scope_boundary' | 'professional_referral' | 'emotional_safety';
    passed: boolean;
    details: string | null;
  }>;

  /** Whether crisis was detected in the user's message */
  crisisDetected: boolean;

  /** Severity level if crisis detected */
  crisisSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';

  /** Recommended action */
  recommendedAction: 'proceed' | 'modify_response' | 'escalate' | 'block';

  /** If response was modified, the reason */
  modificationReason: string | null;
}
```

### 4.8 SuggestedDialAdjustment

```typescript
interface SuggestedDialAdjustment {
  /** Which dial to adjust */
  dialType: 'Parent' | 'Partner' | 'Producer' | 'Player' | 'Power';

  /** Suggested direction */
  direction: 'increase' | 'decrease' | 'no_change';

  /** Magnitude of suggested change (0.1 to 2.0 scale points) */
  magnitude: number;

  /** Reasoning for the suggestion */
  reasoning: string;

  /** Confidence in this suggestion (0.0 to 1.0) */
  confidence: number;

  /** Conversation evidence (message IDs that support the suggestion) */
  evidenceMessageIds: string[];
}
```

### 4.9 ContentRecommendation

```typescript
interface ContentRecommendation {
  /** Content item ID (from Content context) */
  contentId: string;

  /** Type of content */
  contentType: 'podcast_episode' | 'ebook_chapter' | 'ebook_section' | 'framework_guide';

  /** Human-readable title */
  title: string;

  /** Why this was recommended */
  reason: string;

  /** Relevance score (0.0 to 1.0) */
  relevanceScore: number;

  /** The specific topic or dial this relates to */
  relatedDial: 'Parent' | 'Partner' | 'Producer' | 'Player' | 'Power' | null;
}
```

---

## 5. Domain Events

### 5.1 ConversationStarted

Published when a new conversation is created and the first message is sent.

```typescript
interface ConversationStarted {
  eventType: 'ConversationStarted';
  conversationId: string;
  userId: string;
  initialMode: ConversationModeType;
  marriageStage: MarriageStageClassification;
  timestamp: string;
}
```

### 5.2 MessageSent

Published for every user message received.

```typescript
interface MessageSent {
  eventType: 'MessageSent';
  messageId: string;
  conversationId: string;
  userId: string;
  role: 'user';
  contentPreview: string; // First 100 chars, for engagement tracking without full content exposure
  sentiment: number | null;
  currentMode: ConversationModeType;
  timestamp: string;
}
```

### 5.3 AIResponseGenerated

Published after the AI produces and delivers a response.

```typescript
interface AIResponseGenerated {
  eventType: 'AIResponseGenerated';
  messageId: string;
  conversationId: string;
  userId: string;
  model: string;
  tokenUsage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  safetyPassed: boolean;
  suggestedDialAdjustmentCount: number;
  contentRecommendationCount: number;
  timestamp: string;
}
```

### 5.4 ConversationModeChanged

Published when the conversation transitions between modes.

```typescript
interface ConversationModeChanged {
  eventType: 'ConversationModeChanged';
  conversationId: string;
  userId: string;
  previousMode: ConversationModeType;
  newMode: ConversationModeType;
  reason: string;
  triggeredBy: 'user' | 'ai_detection' | 'system';
  timestamp: string;
}
```

### 5.5 CrisisDetected

Published when the safety system detects crisis-level language or intent. This is a high-priority event that may trigger immediate notifications.

```typescript
interface CrisisDetected {
  eventType: 'CrisisDetected';
  conversationId: string;
  userId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggerMessageId: string;
  recommendedAction: 'escalate' | 'provide_resources' | 'alert_support';
  timestamp: string;
}
```

### 5.6 MarriageStageReclassified

Published when the AI detects sufficient evidence to reclassify the user's marriage stage.

```typescript
interface MarriageStageReclassified {
  eventType: 'MarriageStageReclassified';
  conversationId: string;
  userId: string;
  previousStage: MarriageStageClassification;
  newStage: MarriageStageClassification;
  evidenceMessageIds: string[];
  timestamp: string;
}
```

### 5.7 DialAdjustmentSuggested

Published when the AI coach suggests a dial score change based on conversation content. Consumed by the Assessment context.

```typescript
interface DialAdjustmentSuggested {
  eventType: 'DialAdjustmentSuggested';
  conversationId: string;
  userId: string;
  adjustment: SuggestedDialAdjustment;
  timestamp: string;
}
```

### 5.8 ConversationSummarized

Published when a conversation's history is compressed into a summary (typically when the token budget is approaching the limit).

```typescript
interface ConversationSummarized {
  eventType: 'ConversationSummarized';
  conversationId: string;
  userId: string;
  messagesSummarized: number;
  summaryLength: number;
  keyThemes: string[];
  timestamp: string;
}
```

---

## 6. Repositories

### 6.1 ConversationRepository

```typescript
interface ConversationRepository {
  /** Persist a new or updated conversation */
  save(conversation: Conversation): Promise<void>;

  /** Retrieve by ID */
  findById(conversationId: string): Promise<Conversation | null>;

  /** Retrieve all conversations for a user, ordered by most recent */
  findByUserId(userId: string, options?: {
    status?: 'active' | 'closed' | 'archived';
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]>;

  /** Retrieve a conversation with its messages (paginated) */
  findWithMessages(conversationId: string, options?: {
    messageLimit?: number;
    beforeSequence?: number;
  }): Promise<Conversation | null>;

  /** Soft-delete (archive) a conversation */
  archive(conversationId: string): Promise<void>;

  /** Count conversations for a user */
  countByUserId(userId: string): Promise<number>;

  /** Find conversations that need summarization (token count near budget) */
  findNeedingSummarization(threshold: number): Promise<Conversation[]>;
}
```

### 6.2 ConversationSummaryRepository

```typescript
interface ConversationSummaryRepository {
  /** Store a conversation summary */
  save(summary: {
    conversationId: string;
    userId: string;
    summaryText: string;
    keyThemes: string[];
    messageRange: { from: number; to: number };
    createdAt: string;
  }): Promise<void>;

  /** Get all summaries for a conversation */
  findByConversationId(conversationId: string): Promise<Array<{
    summaryText: string;
    keyThemes: string[];
    messageRange: { from: number; to: number };
    createdAt: string;
  }>>;

  /** Get recent summaries across all conversations for a user (for cross-conversation context) */
  findRecentByUserId(userId: string, limit: number): Promise<Array<{
    conversationId: string;
    summaryText: string;
    keyThemes: string[];
    createdAt: string;
  }>>;

  /** Search summaries by theme */
  searchByTheme(userId: string, theme: string): Promise<Array<{
    conversationId: string;
    summaryText: string;
    relevanceScore: number;
  }>>;
}
```

---

## 7. Domain Services

### 7.1 CoachingService

Orchestrates the core coaching flow: receiving a user message, building context, calling the AI, checking safety, and delivering the response.

```typescript
interface CoachingService {
  /** Process an incoming user message and generate an AI response */
  processMessage(
    conversationId: string,
    userMessage: string
  ): Promise<{ message: Message; events: DomainEvent[] }>;

  /** Start a new conversation */
  startConversation(
    userId: string,
    initialMode: ConversationModeType
  ): Promise<{ conversation: Conversation; events: DomainEvent[] }>;

  /** Change the conversation mode */
  changeMode(
    conversationId: string,
    newMode: ConversationModeType,
    reason: string
  ): Promise<{ events: DomainEvent[] }>;

  /** Trigger conversation summarization */
  summarizeConversation(
    conversationId: string
  ): Promise<{ summary: string; events: DomainEvent[] }>;

  /** Close a conversation */
  closeConversation(
    conversationId: string
  ): Promise<{ events: DomainEvent[] }>;
}
```

### 7.2 SafetyService

Performs all safety checks on user input and AI output.

```typescript
interface SafetyService {
  /** Check a user message for crisis indicators */
  checkUserMessage(
    message: string,
    conversationHistory: Message[]
  ): Promise<SafetyCheckResult>;

  /** Check an AI response before delivery */
  checkAIResponse(
    response: string,
    conversationContext: {
      mode: ConversationModeType;
      marriageStage: MarriageStageClassification;
      recentMessages: Message[];
    }
  ): Promise<SafetyCheckResult>;
}
```

### 7.3 ContextAssemblyService

Builds the full context payload sent to the AI for each request.

```typescript
interface ContextAssemblyService {
  /** Assemble the complete context for an AI request */
  assembleContext(
    conversationId: string,
    userId: string
  ): Promise<{
    userContext: UserContext;
    conversationHistory: Message[];
    summaries: string[];
    ragContext: RAGContext | null;
    promptTemplate: PromptTemplate;
  }>;
}
```

### 7.4 MarriageStageClassificationService

Analyzes conversation content to classify or reclassify the user's marriage stage.

```typescript
interface MarriageStageClassificationService {
  /** Classify marriage stage from onboarding data */
  classifyFromOnboarding(
    onboardingResponses: Record<string, string>
  ): Promise<MarriageStageClassification>;

  /** Re-evaluate marriage stage based on conversation evidence */
  reclassifyFromConversation(
    currentClassification: MarriageStageClassification,
    recentMessages: Message[]
  ): Promise<{
    classification: MarriageStageClassification;
    changed: boolean;
  }>;
}
```
