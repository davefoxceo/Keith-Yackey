# Assessment Bounded Context

## 1. Overview

The **Assessment** context owns the Five Dials scoring system, marriage health reporting, trend analysis, and micro-challenge assignment. It is the quantitative backbone of the Coach Keith AI platform -- transforming subjective coaching conversations and user self-reports into measurable, trackable progress.

### Responsibilities

- Five Dials assessment creation and scoring (self-reported and AI-suggested)
- Dial trend tracking over time (weekly, monthly, quarterly)
- Marriage health report generation with actionable insights
- Micro-challenge assignment, tracking, and completion
- Integration with Coaching context for AI-driven dial adjustments
- Historical assessment data storage and querying

### Key Design Decisions

- **FiveDialsAssessment and MarriageHealthReport are separate aggregates.** Assessments are point-in-time snapshots. Reports are derived analytical artifacts that synthesize multiple assessments.
- **DialType is a closed enum.** The five dials (Parent, Partner, Producer, Player, Power) are a core framework concept and will not change without a major domain revision.
- **AI-suggested adjustments require explicit application.** The Coaching context suggests dial changes, but Assessment decides whether and how to apply them. This preserves Assessment's sovereignty.
- **Micro-challenges are tied to assessments, not conversations.** A challenge is born from an assessment insight, not from a specific chat message.

---

## 2. Aggregates

### 2.1 FiveDialsAssessment (Aggregate Root)

A point-in-time assessment of a user's Five Dials scores. Users complete assessments periodically (weekly recommended, minimum bi-weekly). Assessments can also be triggered by AI-suggested adjustments from coaching conversations.

**Invariants:**
- An assessment must contain exactly 5 dial scores, one for each `DialType`.
- Each dial score must be between 1 and 10 (inclusive), in 0.5 increments.
- An assessment must be associated with a valid `userId`.
- Once finalized (`status: 'completed'`), dial scores cannot be modified.
- AI-applied adjustments must be recorded with their source `conversationId` for traceability.
- The `assessmentPeriod` must not overlap with another completed assessment for the same user.

```typescript
interface FiveDialsAssessment {
  /** Unique assessment identifier */
  id: string;

  /** The user who completed this assessment */
  userId: string;

  /** The five dial scores */
  dialScores: [DialScore, DialScore, DialScore, DialScore, DialScore];

  /** How this assessment was initiated */
  source: 'user_initiated' | 'scheduled_prompt' | 'ai_suggested' | 'onboarding';

  /** If source is 'ai_suggested', the conversation that triggered it */
  triggeringConversationId: string | null;

  /** The assessment period this covers */
  period: AssessmentPeriod;

  /** Current status */
  status: 'in_progress' | 'completed' | 'expired';

  /** Micro-challenges generated from this assessment */
  assignedChallenges: MicroChallenge[];

  /** Overall composite score (calculated) */
  compositeScore: number;

  /** Comparison with previous assessment */
  changeFromPrevious: {
    compositeScoreDelta: number;
    dialDeltas: Record<DialType, number>;
    overallTrend: 'improving' | 'stable' | 'declining';
  } | null;

  /** Optional notes the user added */
  userNotes: string | null;

  /** ISO 8601 */
  createdAt: string;

  /** ISO 8601 */
  completedAt: string | null;
}
```

### 2.2 MarriageHealthReport (Aggregate Root)

A synthesized report that aggregates multiple Five Dials assessments into a comprehensive view of the user's marriage health trajectory. Reports are generated periodically (monthly) or on demand.

**Invariants:**
- A report must reference at least 2 completed assessments.
- The `reportPeriod` must be at least 14 days.
- Action items must be specific and tied to a dial.
- The `overallHealthScore` must be calculable from the included assessments.
- A report cannot be regenerated once finalized (a new report must be created instead).

```typescript
interface MarriageHealthReport {
  /** Unique report identifier */
  id: string;

  /** The user this report belongs to */
  userId: string;

  /** The period this report covers */
  reportPeriod: {
    startDate: string;
    endDate: string;
  };

  /** IDs of assessments included in this report */
  assessmentIds: string[];

  /** Number of assessments analyzed */
  assessmentCount: number;

  /** Overall marriage health score (0-100) */
  overallHealthScore: MarriageHealthScore;

  /** Trend lines for each dial over the report period */
  dialTrends: Record<DialType, TrendLine>;

  /** AI-generated narrative summary */
  narrativeSummary: string;

  /** Strengths identified */
  strengths: Array<{
    dial: DialType;
    description: string;
    evidence: string;
  }>;

  /** Areas needing attention */
  areasForGrowth: Array<{
    dial: DialType;
    description: string;
    suggestedActions: string[];
  }>;

  /** Specific action items */
  actionItems: ActionItem[];

  /** Report generation status */
  status: 'generating' | 'completed' | 'failed';

  /** ISO 8601 */
  generatedAt: string;
}
```

---

## 3. Entities

### 3.1 DialScore

An individual score for one of the Five Dials within an assessment.

```typescript
interface DialScore {
  /** Unique identifier */
  id: string;

  /** Which dial this score is for */
  dialType: DialType;

  /** The score value (1.0 to 10.0, in 0.5 increments) */
  rating: DialRating;

  /** How the score was determined */
  source: 'self_reported' | 'ai_adjusted';

  /** If AI-adjusted, the original self-reported value */
  originalRating: DialRating | null;

  /** If AI-adjusted, the adjustment details */
  aiAdjustment: {
    conversationId: string;
    reasoning: string;
    confidence: number;
    adjustedAt: string;
  } | null;

  /** Trend relative to the previous assessment's score for this dial */
  trend: DialTrend;

  /** User's optional reflection on this dial */
  reflection: string | null;
}
```

### 3.2 AssessmentHistory

Maintains an ordered history of all assessments for a user, enabling trend calculations and report generation. This is a read-optimized projection entity.

```typescript
interface AssessmentHistory {
  /** The user ID */
  userId: string;

  /** Total completed assessments */
  totalAssessments: number;

  /** Date of first assessment */
  firstAssessmentDate: string;

  /** Date of most recent assessment */
  latestAssessmentDate: string;

  /** Current composite score */
  currentCompositeScore: number;

  /** All-time high composite score */
  highWaterMark: { score: number; date: string };

  /** Current dial scores (latest) */
  currentDialScores: Record<DialType, DialRating>;

  /** Assessment frequency (average days between assessments) */
  averageFrequencyDays: number;

  /** Longest streak of weekly assessments */
  longestWeeklyStreak: number;

  /** Current streak of weekly assessments */
  currentWeeklyStreak: number;

  /** Historical snapshots for charting (compressed) */
  historicalSnapshots: Array<{
    date: string;
    compositeScore: number;
    dialScores: Record<DialType, number>;
  }>;
}
```

---

## 4. Value Objects

### 4.1 DialType

```typescript
type DialType = 'Parent' | 'Partner' | 'Producer' | 'Player' | 'Power';
```

**Definitions:**
- **Parent:** How effectively the user shows up as a father and family leader.
- **Partner:** The quality and intentionality of the marital relationship.
- **Producer:** Professional fulfillment, career direction, and financial stewardship.
- **Player:** Personal recreation, hobbies, fitness, and fun.
- **Power:** Spiritual health, personal growth, mindset, and inner strength.

### 4.2 DialRating

```typescript
interface DialRating {
  /** Score value: 1.0 to 10.0, in 0.5 increments */
  readonly value: number;
}
```

**Constraints:** Must be a number between 1.0 and 10.0 inclusive. Must be a multiple of 0.5 (i.e., valid values are 1.0, 1.5, 2.0, ..., 9.5, 10.0).

### 4.3 DialTrend

```typescript
interface DialTrend {
  /** Direction of change */
  readonly direction: 'up' | 'down' | 'stable';

  /** Absolute change from previous assessment */
  readonly delta: number;

  /** Percentage change from previous assessment */
  readonly percentageChange: number;

  /** Number of consecutive assessments in this direction */
  readonly consecutiveCount: number;
}
```

### 4.4 MarriageHealthScore

```typescript
interface MarriageHealthScore {
  /** Score from 0 to 100 */
  readonly value: number;

  /** Qualitative label */
  readonly label: 'critical' | 'struggling' | 'fair' | 'good' | 'thriving';

  /** How the score was calculated */
  readonly methodology: string;
}
```

**Label mapping:**
- 0-20: `critical`
- 21-40: `struggling`
- 41-60: `fair`
- 61-80: `good`
- 81-100: `thriving`

### 4.5 AssessmentPeriod

```typescript
interface AssessmentPeriod {
  /** Start date of the period this assessment covers (ISO 8601 date) */
  readonly startDate: string;

  /** End date of the period (ISO 8601 date) */
  readonly endDate: string;

  /** Period type */
  readonly type: 'weekly' | 'biweekly' | 'monthly' | 'ad_hoc';
}
```

**Constraints:** `endDate` must be after `startDate`. For `weekly` type, the span must be 5-9 days. For `biweekly`, 12-16 days. For `monthly`, 25-35 days.

### 4.6 TrendLine

```typescript
interface TrendLine {
  /** The dial this trend line represents */
  readonly dialType: DialType;

  /** Data points in chronological order */
  readonly dataPoints: Array<{
    date: string;
    value: number;
  }>;

  /** Linear regression slope (positive = improving) */
  readonly slope: number;

  /** R-squared value (goodness of fit) */
  readonly rSquared: number;

  /** Overall direction interpretation */
  readonly direction: 'improving' | 'stable' | 'declining';

  /** Predicted value at next assessment (simple linear projection) */
  readonly projectedNextValue: number;
}
```

### 4.7 ActionItem

```typescript
interface ActionItem {
  /** Unique identifier */
  readonly id: string;

  /** Which dial this action targets */
  readonly targetDial: DialType;

  /** Priority level */
  readonly priority: 'high' | 'medium' | 'low';

  /** The action description */
  readonly description: string;

  /** Why this action was recommended */
  readonly rationale: string;

  /** Suggested timeframe */
  readonly timeframe: 'this_week' | 'this_month' | 'this_quarter';

  /** Whether this action has been acknowledged by the user */
  readonly acknowledged: boolean;
}
```

### 4.8 MicroChallenge

```typescript
interface MicroChallenge {
  /** Unique identifier */
  readonly id: string;

  /** The assessment that generated this challenge */
  readonly assessmentId: string;

  /** The user assigned to this challenge */
  readonly userId: string;

  /** Which dial this challenge targets */
  readonly targetDial: DialType;

  /** Short title */
  readonly title: string;

  /** Detailed description of the challenge */
  readonly description: string;

  /** Specific steps to complete the challenge */
  readonly steps: string[];

  /** Difficulty level */
  readonly difficulty: 'easy' | 'moderate' | 'stretch';

  /** Estimated time to complete (in minutes) */
  readonly estimatedMinutes: number;

  /** ISO 8601 date by which the challenge should be completed */
  readonly dueDate: string;

  /** Current status */
  readonly status: 'assigned' | 'in_progress' | 'completed' | 'skipped' | 'expired';

  /** User's reflection upon completion (null until completed) */
  readonly completionReflection: string | null;

  /** ISO 8601 */
  readonly assignedAt: string;

  /** ISO 8601 (null until completed) */
  readonly completedAt: string | null;

  /** Impact score reported by user after completion (1-5, null until completed) */
  readonly reportedImpact: number | null;
}
```

---

## 5. Domain Events

### 5.1 FiveDialsAssessmentCompleted

Published when a user finishes a Five Dials assessment. This is one of the most important events in the system -- it triggers report generation, challenge assignment, and coaching context updates.

```typescript
interface FiveDialsAssessmentCompleted {
  eventType: 'FiveDialsAssessmentCompleted';
  assessmentId: string;
  userId: string;
  dialScores: Record<DialType, number>;
  compositeScore: number;
  source: 'user_initiated' | 'scheduled_prompt' | 'ai_suggested' | 'onboarding';
  changeFromPrevious: {
    compositeScoreDelta: number;
    overallTrend: 'improving' | 'stable' | 'declining';
  } | null;
  timestamp: string;
}
```

### 5.2 DialScoreChanged

Published when a specific dial score changes significantly from the previous assessment (delta >= 1.0).

```typescript
interface DialScoreChanged {
  eventType: 'DialScoreChanged';
  assessmentId: string;
  userId: string;
  dialType: DialType;
  previousScore: number;
  newScore: number;
  delta: number;
  direction: 'up' | 'down';
  timestamp: string;
}
```

### 5.3 AIDialAdjustmentApplied

Published when an AI-suggested dial adjustment (from the Coaching context) is accepted and applied to the user's scores.

```typescript
interface AIDialAdjustmentApplied {
  eventType: 'AIDialAdjustmentApplied';
  assessmentId: string;
  userId: string;
  dialType: DialType;
  originalScore: number;
  adjustedScore: number;
  conversationId: string;
  reasoning: string;
  confidence: number;
  timestamp: string;
}
```

### 5.4 MarriageHealthReportGenerated

Published when a marriage health report is successfully generated.

```typescript
interface MarriageHealthReportGenerated {
  eventType: 'MarriageHealthReportGenerated';
  reportId: string;
  userId: string;
  overallHealthScore: number;
  healthLabel: 'critical' | 'struggling' | 'fair' | 'good' | 'thriving';
  assessmentCount: number;
  reportPeriod: { startDate: string; endDate: string };
  actionItemCount: number;
  timestamp: string;
}
```

### 5.5 MicroChallengeAssigned

Published when a micro-challenge is assigned to a user.

```typescript
interface MicroChallengeAssigned {
  eventType: 'MicroChallengeAssigned';
  challengeId: string;
  assessmentId: string;
  userId: string;
  targetDial: DialType;
  title: string;
  difficulty: 'easy' | 'moderate' | 'stretch';
  dueDate: string;
  timestamp: string;
}
```

### 5.6 MicroChallengeCompleted

Published when a user marks a micro-challenge as completed and provides a reflection.

```typescript
interface MicroChallengeCompleted {
  eventType: 'MicroChallengeCompleted';
  challengeId: string;
  userId: string;
  targetDial: DialType;
  completionReflection: string;
  reportedImpact: number;
  durationDays: number;
  timestamp: string;
}
```

### 5.7 SignificantDialImprovement

Published when a dial score improves by 2.0 or more points over a 30-day period. This is a celebration-worthy event shared with the Community context.

```typescript
interface SignificantDialImprovement {
  eventType: 'SignificantDialImprovement';
  userId: string;
  dialType: DialType;
  previousScore: number;
  currentScore: number;
  improvementDelta: number;
  periodDays: number;
  timestamp: string;
}
```

---

## 6. Repositories

### 6.1 AssessmentRepository

```typescript
interface AssessmentRepository {
  /** Persist a new or updated assessment */
  save(assessment: FiveDialsAssessment): Promise<void>;

  /** Find by assessment ID */
  findById(assessmentId: string): Promise<FiveDialsAssessment | null>;

  /** Find all assessments for a user, ordered by creation date (descending) */
  findByUserId(userId: string, options?: {
    status?: 'in_progress' | 'completed' | 'expired';
    limit?: number;
    offset?: number;
  }): Promise<FiveDialsAssessment[]>;

  /** Find the most recent completed assessment for a user */
  findLatestCompleted(userId: string): Promise<FiveDialsAssessment | null>;

  /** Find assessments within a date range (for report generation) */
  findByDateRange(userId: string, startDate: string, endDate: string): Promise<FiveDialsAssessment[]>;

  /** Get the assessment history projection for a user */
  getHistory(userId: string): Promise<AssessmentHistory>;

  /** Check if a user has a pending (in-progress) assessment */
  findInProgress(userId: string): Promise<FiveDialsAssessment | null>;

  /** Count completed assessments for a user */
  countCompleted(userId: string): Promise<number>;
}
```

### 6.2 MarriageHealthReportRepository

```typescript
interface MarriageHealthReportRepository {
  /** Persist a new report */
  save(report: MarriageHealthReport): Promise<void>;

  /** Find by report ID */
  findById(reportId: string): Promise<MarriageHealthReport | null>;

  /** Find all reports for a user, ordered by generation date (descending) */
  findByUserId(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<MarriageHealthReport[]>;

  /** Find the most recent report for a user */
  findLatest(userId: string): Promise<MarriageHealthReport | null>;

  /** Find reports within a date range */
  findByDateRange(userId: string, startDate: string, endDate: string): Promise<MarriageHealthReport[]>;
}
```

### 6.3 MicroChallengeRepository

```typescript
interface MicroChallengeRepository {
  /** Persist a new or updated challenge */
  save(challenge: MicroChallenge): Promise<void>;

  /** Find by challenge ID */
  findById(challengeId: string): Promise<MicroChallenge | null>;

  /** Find all challenges for a user */
  findByUserId(userId: string, options?: {
    status?: 'assigned' | 'in_progress' | 'completed' | 'skipped' | 'expired';
    targetDial?: DialType;
    limit?: number;
    offset?: number;
  }): Promise<MicroChallenge[]>;

  /** Find active challenges (assigned or in_progress) for a user */
  findActive(userId: string): Promise<MicroChallenge[]>;

  /** Find expired challenges that need status update */
  findExpired(): Promise<MicroChallenge[]>;

  /** Get completion statistics for a user */
  getCompletionStats(userId: string): Promise<{
    totalAssigned: number;
    totalCompleted: number;
    totalSkipped: number;
    totalExpired: number;
    completionRate: number;
    averageImpactScore: number;
    completionsByDial: Record<DialType, number>;
  }>;

  /** Find the most impactful completed challenges (for coaching context) */
  findHighImpact(userId: string, minImpact: number, limit: number): Promise<MicroChallenge[]>;
}
```

---

## 7. Domain Services

### 7.1 AssessmentScoringService

Calculates composite scores, deltas, and trends when an assessment is completed.

```typescript
interface AssessmentScoringService {
  /** Calculate the composite score from individual dial ratings */
  calculateCompositeScore(dialScores: DialScore[]): number;

  /** Calculate changes from the previous assessment */
  calculateDeltas(
    currentScores: DialScore[],
    previousScores: DialScore[] | null
  ): {
    compositeScoreDelta: number;
    dialDeltas: Record<DialType, number>;
    overallTrend: 'improving' | 'stable' | 'declining';
  } | null;

  /** Determine trend for a specific dial based on assessment history */
  calculateDialTrend(
    dialType: DialType,
    historicalScores: Array<{ date: string; value: number }>
  ): DialTrend;
}
```

### 7.2 AIAdjustmentService

Processes AI-suggested dial adjustments from the Coaching context and decides whether to apply them.

```typescript
interface AIAdjustmentService {
  /** Evaluate an AI-suggested adjustment and decide whether to apply it */
  evaluateAdjustment(
    userId: string,
    suggestion: {
      dialType: DialType;
      direction: 'increase' | 'decrease';
      magnitude: number;
      confidence: number;
      conversationId: string;
      reasoning: string;
    }
  ): Promise<{
    accepted: boolean;
    adjustedScore: number | null;
    rejectionReason: string | null;
    events: DomainEvent[];
  }>;
}
```

### 7.3 ReportGenerationService

Orchestrates the generation of marriage health reports.

```typescript
interface ReportGenerationService {
  /** Generate a marriage health report for a user over a given period */
  generateReport(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{ report: MarriageHealthReport; events: DomainEvent[] }>;

  /** Generate trend lines for all dials over a period */
  generateTrendLines(
    assessments: FiveDialsAssessment[]
  ): Record<DialType, TrendLine>;

  /** Generate AI narrative summary from assessment data */
  generateNarrative(
    assessments: FiveDialsAssessment[],
    trendLines: Record<DialType, TrendLine>
  ): Promise<string>;
}
```

### 7.4 MicroChallengeService

Creates and manages micro-challenges based on assessment results.

```typescript
interface MicroChallengeService {
  /** Generate micro-challenges from a completed assessment */
  generateChallenges(
    assessment: FiveDialsAssessment,
    previousChallenges: MicroChallenge[]
  ): Promise<{ challenges: MicroChallenge[]; events: DomainEvent[] }>;

  /** Mark a challenge as completed with user reflection */
  completeChallenge(
    challengeId: string,
    reflection: string,
    reportedImpact: number
  ): Promise<{ challenge: MicroChallenge; events: DomainEvent[] }>;

  /** Skip a challenge */
  skipChallenge(
    challengeId: string,
    reason: string
  ): Promise<{ challenge: MicroChallenge; events: DomainEvent[] }>;

  /** Expire overdue challenges (called by scheduled job) */
  expireOverdueChallenges(): Promise<{ expiredCount: number; events: DomainEvent[] }>;
}
```
