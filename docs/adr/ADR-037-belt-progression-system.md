# ADR-037: BJJ-Inspired Belt Progression System

**Status:** Proposed
**Date:** 2026-03-24
**Related:** ADR-035 (Admin Dashboard), ADR-034 (Stripe Payments)

---

## Context

Coach Keith AI needs a long-term retention mechanism beyond daily streaks and weekly assessments. Users who complete the initial novelty phase (weeks 1-3) need a visible, meaningful sense of progress to stay engaged. Keith's background in martial arts makes a belt system a natural fit -- it is immediately understood, carries aspirational weight, and maps well to the progressive mastery of relationship skills.

The belt system also gives Keith a quick visual indicator of client maturity in the admin dashboard, replacing the need to dig through weeks of data to gauge where someone is in their journey.

---

## Decision

**Implement a 5-tier belt progression system (White through Black) calculated from a composite algorithm that evaluates tenure, leading scores, streak consistency, chat engagement, and assessment completion. Belt is recalculated weekly and displayed across the app.**

### Belt Tiers

| Belt | Color Code | Meaning |
|------|-----------|---------|
| **White** | `#F1F5F9` | Beginner -- just getting started, learning the framework |
| **Blue** | `#3B82F6` | Developing -- building consistent habits, understanding the dials |
| **Purple** | `#8B5CF6` | Intermediate -- strong consistency, applying coaching independently |
| **Brown** | `#92400E` | Advanced -- high scores sustained over months, mentoring mindset |
| **Black** | `#0F172A` | Master -- elite consistency over 6+ months, fully internalized the system |

### Progression Algorithm

The belt score is calculated weekly from five weighted inputs:

```
belt_score = (weeks_active * 0.15)
           + (avg_leading_score_pct * 0.30)
           + (streak_consistency_pct * 0.25)
           + (chat_sessions_per_week_normalized * 0.15)
           + (assessment_completion_pct * 0.15)
```

Where:
- `weeks_active` = total weeks since account creation, capped at 26 for scoring (0-100 scale: week 1 = 4, week 26 = 100)
- `avg_leading_score_pct` = average leading score over the last 4 weeks as a percentage of max (35)
- `streak_consistency_pct` = percentage of days with a check-in over the last 4 weeks
- `chat_sessions_per_week_normalized` = avg weekly chat sessions, capped at 5 for scoring (1 session = 20, 5+ = 100)
- `assessment_completion_pct` = percentage of expected assessments completed in the last 4 weeks

### Belt Thresholds

| Belt | Minimum Score | Minimum Weeks | Additional Requirements |
|------|--------------|---------------|------------------------|
| **White** | 0 | 0 | None (default belt) |
| **Blue** | 35 | 4 | At least one full assessment cycle completed |
| **Purple** | 55 | 10 | Average leading score 20+ over last 4 weeks |
| **Brown** | 75 | 18 | 85%+ streak consistency over last 8 weeks |
| **Black** | 90 | 26 | All above sustained for 8+ consecutive weeks |

Belts can only go up, never down. Once earned, a belt is permanent. This prevents discouragement if a user has a rough week.

### Belt Change Events

When a user earns a new belt:

1. A congratulations message is sent from Coach Keith in the chat: "You just earned your [Belt] belt. That means [explanation of what this level represents]. Keep leading."
2. A celebratory UI moment on the dashboard (belt icon animates, brief confetti)
3. The belt change is logged as an event in DataStore for admin visibility
4. Keith receives a notification in the admin dashboard: "[User] promoted to [Belt] belt"

---

## Implementation

### Data Model

```typescript
interface UserBelt {
  currentBelt: 'white' | 'blue' | 'purple' | 'brown' | 'black';
  beltScore: number;
  earnedAt: string;          // ISO date when current belt was earned
  history: {                 // record of all belt promotions
    belt: string;
    earnedAt: string;
    score: number;
  }[];
}
```

Stored on the user profile in DataStore (Pi-Brain), updated by the weekly calculation job.

### Weekly Calculation

A scheduled job runs every Sunday at midnight UTC:

1. Query all active users from DataStore
2. For each user, gather the last 4-8 weeks of assessment scores, streaks, and chat activity
3. Calculate `belt_score` using the algorithm above
4. Check if the score and tenure meet a higher belt's threshold
5. If promoted, update the user's belt record and trigger the congratulations flow
6. Write the updated belt to DataStore

### Display Locations

| Location | Display |
|----------|---------|
| User dashboard | Belt icon + label next to username |
| User profile page | Belt with progress bar showing distance to next belt |
| Chat header | Small belt indicator |
| Admin client list (ADR-035) | Belt column for quick scanning |
| Admin client detail | Belt history timeline |

### Feature Gating

Belt progression is available to **Premium and Elite** tiers (ADR-034). Core tier users see a locked belt icon with "Upgrade to track your belt progression." White belt is assigned to all users by default regardless of tier, but progression beyond White requires Premium.

---

## Consequences

### Positive

- Provides a long-term motivation arc that daily streaks alone cannot sustain
- Immediately communicates client maturity to Keith in admin views
- BJJ metaphor resonates with Keith's audience and brand
- Permanent belts prevent the "punishment" feeling of losing progress
- Belt promotions create natural moments for re-engagement and celebration

### Negative

- Algorithm tuning will require iteration -- initial thresholds are estimates based on expected usage patterns
- Weekly calculation means a user who crosses a threshold on Monday waits until Sunday for promotion
- Users may game the system (logging minimal check-ins just to maintain streaks) rather than genuinely engaging
- Additional data queries for the belt calculation add load to the weekly job

### Risks

- If thresholds are too easy, belts lose meaning (mitigation: review distribution monthly, adjust if > 30% reach Brown in first 3 months)
- If thresholds are too hard, users feel stuck and disengage (mitigation: show progress percentage toward next belt)
- Black belt could feel unattainable (mitigation: 26-week minimum is ambitious but achievable for committed users, roughly 6 months)
