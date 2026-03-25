# Accountability Bounded Context

## Overview

The **Accountability** context is the core differentiator of Coach Keith AI. Keith does not wait to be asked -- he holds you accountable. This context owns smart brain accountability logic, proactive interventions, individualized challenges, and score trend monitoring. When a user's dial scores decline, their streak breaks, or they go silent, Keith reaches out first.

**Upstream Dependencies:** Assessment (dial scores, trends), Coaching (conversation history, session activity), Engagement (streaks, daily engagement)
**Downstream Consumers:** Coaching (intervention triggers shape next conversation), Engagement (challenge completion feeds streaks), Admin (intervention analytics)
**Referenced ADRs:** 047 (proactive accountability engine), 049 (individualized challenge system)

---

## Aggregates

### AccountabilityProfile (Aggregate Root)

A per-user profile that tracks score trends across all five dials, active interventions, and accountability preferences. The profile is the decision engine for when and how Keith intervenes.

**Invariants:**
- A user has exactly one AccountabilityProfile.
- Score trends must include at least 2 data points before a direction can be determined.
- No more than 3 active interventions at a time (to avoid notification fatigue).
- Intervention cooldown: minimum 48 hours between interventions of the same trigger type.

### ChallengeSet (Aggregate Root)

A curated set of individualized challenges assigned to a user based on their weakest dials and recent trends. Unlike Assessment micro-challenges (reactive, post-assessment), these are proactive and targeted at preventing decline.

**Invariants:**
- A ChallengeSet contains 1-3 active challenges at a time.
- Challenges must target the user's lowest-trending dials.
- Difficulty must be calibrated to the user's historical completion rate.
- Expired challenges that were never started are logged as missed (feeds intervention logic).

---

## Entities

```typescript
interface ScoreTrend {
  readonly dial: DialType;
  readonly current: number;
  readonly previous4Weeks: number[]; // last 4 weekly scores
  readonly direction: TrendDirection;
  readonly velocityPerWeek: number; // rate of change
  readonly updatedAt: string;
}

interface ProactiveIntervention {
  readonly id: string;
  readonly userId: string;
  readonly trigger: InterventionTrigger;
  readonly message: string; // Keith's personalized accountability message
  readonly channel: 'push' | 'in_app' | 'voice'; // voice = triggers a Voice context session
  readonly deliveredAt: string | null;
  readonly acknowledgedAt: string | null;
  readonly resultedInSession: boolean; // did the user start a coaching session after?
}

interface IndividualizedChallenge {
  readonly id: string;
  readonly userId: string;
  readonly dialTarget: DialType;
  readonly action: string; // e.g., "Take your wife on a date this week -- no phones"
  readonly difficulty: 'easy' | 'moderate' | 'stretch';
  readonly dueDate: string;
  readonly status: 'assigned' | 'in_progress' | 'completed' | 'missed';
  readonly assignedAt: string;
  readonly completedAt: string | null;
}
```

---

## Value Objects

```typescript
type TrendDirection = 'improving' | 'declining' | 'stagnant';

type InterventionTrigger =
  | 'dial_drop'          // any dial drops >= 1.0 in a single assessment
  | 'inactive'           // no app engagement for 3+ days
  | 'missed_assessment'  // skipped scheduled assessment
  | 'streak_break'       // engagement streak broken
  | 'challenge_missed'   // assigned challenge expired without action
  | 'score_plateau';     // no improvement across 3+ assessments

interface InterventionTemplate {
  readonly trigger: InterventionTrigger;
  readonly toneLevel: 'gentle' | 'direct' | 'tough_love'; // escalates with repeat triggers
  readonly messageTemplate: string; // supports {{dial}}, {{score}}, {{userName}} tokens
}
```

---

## Domain Events

```typescript
interface InterventionTriggered {
  readonly eventType: 'accountability.intervention_triggered';
  readonly userId: string;
  readonly trigger: InterventionTrigger;
  readonly interventionId: string;
  readonly channel: string;
  readonly timestamp: string;
}

interface ChallengeAssigned {
  readonly eventType: 'accountability.challenge_assigned';
  readonly userId: string;
  readonly challengeId: string;
  readonly dialTarget: string;
  readonly difficulty: string;
  readonly dueDate: string;
  readonly timestamp: string;
}

interface ChallengeCompleted {
  readonly eventType: 'accountability.challenge_completed';
  readonly userId: string;
  readonly challengeId: string;
  readonly dialTarget: string;
  readonly timestamp: string;
}

interface ScoreDeclined {
  readonly eventType: 'accountability.score_declined';
  readonly userId: string;
  readonly dial: string;
  readonly previousScore: number;
  readonly currentScore: number;
  readonly delta: number;
  readonly timestamp: string;
}

interface ScoreImproved {
  readonly eventType: 'accountability.score_improved';
  readonly userId: string;
  readonly dial: string;
  readonly previousScore: number;
  readonly currentScore: number;
  readonly delta: number;
  readonly timestamp: string;
}
```
