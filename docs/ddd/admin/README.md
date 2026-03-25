# Admin Bounded Context

## Overview

The **Admin** context provides Keith Yackey (the human coach) with a dashboard for client management, call preparation, analytics, and risk monitoring. This context is strictly **read-only and downstream** -- it consumes data from all other bounded contexts but never modifies their state. It is the single pane of glass Keith uses to run his coaching business.

**Upstream Dependencies:** ALL other contexts (Identity, Coaching, Assessment, Engagement, Gamification, Accountability, Subscription, Community, Content, LiveEvents, Voice)
**Downstream Consumers:** None -- this is a terminal consumer.
**Integration Pattern:** Anti-Corruption Layer -- Admin translates upstream models into its own read-optimized projections.
**Referenced ADRs:** 035 (admin dashboard), 042 (client grading algorithm), 050 (call prep automation)

---

## Aggregates

### AdminDashboard (Aggregate Root)

The top-level dashboard aggregate that holds platform-wide metrics, client roster, and alert state. Refreshed on a schedule and on-demand.

**Invariants:**
- Only one AdminDashboard instance exists (singleton per admin user).
- Metrics must be calculated from the last 30-day rolling window unless otherwise specified.
- Red alerts must surface within 5 minutes of the triggering event.

### CallPrepReport (Aggregate Root)

An auto-generated briefing document prepared before Keith's scheduled coaching calls. Summarizes each client's recent activity, risk signals, and suggested talking points.

**Invariants:**
- A CallPrepReport is generated at most once per scheduled call.
- The report must be generated at least 1 hour before the call start time.
- Client summaries must include data from the last 14 days minimum.

---

## Entities

```typescript
interface ClientOverview {
  readonly userId: string;
  readonly displayName: string;
  readonly grade: ClientGrade;
  readonly belt: string;
  readonly currentDialScores: Record<string, number>;
  readonly compositeScore: number;
  readonly riskLevel: RiskLevel;
  readonly lastActive: string;
  readonly streakDays: number;
  readonly subscriptionStatus: string;
  readonly joinedAt: string;
}

interface CallSchedule {
  readonly id: string;
  readonly day: string; // 'Monday' | 'Tuesday' | etc.
  readonly time: string; // HH:mm in Keith's timezone
  readonly clientIds: string[];
  readonly callType: 'one_on_one' | 'group' | 'brotherhood';
}

interface PrepReport {
  readonly id: string;
  readonly callScheduleId: string;
  readonly generatedAt: string;
  readonly clientSummaries: ClientCallSummary[];
  readonly redFlags: RedFlag[];
  readonly suggestedTopics: string[];
}

interface ClientCallSummary {
  readonly userId: string;
  readonly recentDialTrend: string; // 'improving' | 'declining' | 'stable'
  readonly lastCoachingSession: string | null; // ISO 8601
  readonly openChallenges: number;
  readonly recentWins: string[];
  readonly concerns: string[];
}

interface RedFlag {
  readonly userId: string;
  readonly type: 'score_crash' | 'inactivity' | 'crisis_detected' | 'churn_risk' | 'missed_calls';
  readonly detail: string;
  readonly severity: 'warning' | 'critical';
  readonly detectedAt: string;
}
```

---

## Value Objects

```typescript
interface ClientGrade {
  readonly letter: 'A' | 'B' | 'C' | 'D' | 'F';
  readonly score: number; // 0-100, weighted composite
  readonly weights: {
    engagementConsistency: number; // 0.30
    dialImprovement: number;      // 0.25
    challengeCompletion: number;  // 0.20
    sessionFrequency: number;     // 0.15
    communityParticipation: number; // 0.10
  };
}

type RiskLevel = 'healthy' | 'at_risk' | 'critical';

interface DashboardMetrics {
  readonly totalUsers: number;
  readonly activeUsers30d: number;
  readonly mrr: number; // monthly recurring revenue in cents
  readonly avgLeadingScore: number;
  readonly churnRate: number; // percentage, trailing 30 days
  readonly avgStreakDays: number;
  readonly beltDistribution: Record<string, number>;
  readonly gradeDistribution: Record<string, number>;
}
```

---

## Domain Events

```typescript
interface CallPrepGenerated {
  readonly eventType: 'admin.call_prep_generated';
  readonly reportId: string;
  readonly callScheduleId: string;
  readonly clientCount: number;
  readonly redFlagCount: number;
  readonly timestamp: string;
}

interface ClientGradeChanged {
  readonly eventType: 'admin.client_grade_changed';
  readonly userId: string;
  readonly previousGrade: string;
  readonly newGrade: string;
  readonly timestamp: string;
}

interface RedAlertTriggered {
  readonly eventType: 'admin.red_alert_triggered';
  readonly userId: string;
  readonly alertType: string;
  readonly severity: string;
  readonly detail: string;
  readonly timestamp: string;
}
```
