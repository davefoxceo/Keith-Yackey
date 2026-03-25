# Gamification Bounded Context

## Overview

The **Gamification** context owns belt progression, leaderboard rankings, milestone tracking, and referral rewards. It transforms raw assessment scores and engagement signals into visible progress indicators that motivate sustained behavior change. Gamification consumes data from Assessment and Engagement but never modifies their state.

**Upstream Dependencies:** Assessment (dial scores, composite scores), Engagement (streaks, daily engagement)
**Downstream Consumers:** Coaching (belt level informs tone), Community (leaderboard visibility), Admin (progression analytics)
**Referenced ADRs:** 037 (gamification system), 044 (belt progression rules), 046 (leaderboard design), 047 (referral rewards)

---

## Aggregates

### BeltProfile (Aggregate Root)

Tracks a user's belt progression from White through Black. Belt promotions are calculated from composite assessment scores, streak length, and challenge completion rate.

**Invariants:**
- A user has exactly one BeltProfile.
- Belt promotions are one-directional -- a user cannot be demoted.
- Promotion requires meeting ALL threshold criteria for the next belt level.
- `promotedAt` must be recorded for every belt change.

### Leaderboard (Aggregate Root)

A ranked collection of users scored by a weighted composite of leading score, streak, belt, and consistency. Leaderboards are recalculated on a schedule (daily) and scoped by group (global, Brotherhood).

**Invariants:**
- A Leaderboard must have a defined scope and scoring weights.
- Rankings must be recalculated atomically -- partial updates are not allowed.
- Tied composite scores are broken by streak length, then by belt level.

### MilestoneTracker (Aggregate Root)

Tracks a user's progress toward gamification-specific milestones (distinct from Engagement milestones). Examples: "First Belt Promotion", "Top 10 Leaderboard", "5 Referrals Converted".

**Invariants:**
- Each milestone type can only be achieved once per user.
- Achievement must be backed by verifiable criteria.

---

## Entities

```typescript
interface Belt {
  readonly level: 'White' | 'Yellow' | 'Orange' | 'Green' | 'Blue' | 'Purple' | 'Brown' | 'Black';
  readonly promotedAt: string; // ISO 8601
  readonly previousLevel: string | null;
}

interface LeaderboardEntry {
  readonly userId: string;
  readonly compositeScore: CompositeScore;
  readonly rank: number;
  readonly previousRank: number | null;
  readonly updatedAt: string;
}

interface Milestone {
  readonly id: string;
  readonly type: 'FirstBeltPromotion' | 'TopTenLeaderboard' | 'FiveReferrals' | 'BlackBelt' | 'ThirtyDayStreak';
  readonly achievedAt: string;
  readonly metadata: Record<string, unknown>;
}

interface ReferralCode {
  readonly code: string;
  readonly userId: string;
  readonly referralsCount: number;
  readonly conversionsCount: number;
  readonly rewardsEarned: number; // months of free subscription credited
  readonly createdAt: string;
}
```

---

## Value Objects

```typescript
interface CompositeScore {
  readonly value: number; // 0-100
  readonly leadingWeight: number; // default 0.40
  readonly streakWeight: number; // default 0.20
  readonly beltWeight: number; // default 0.25
  readonly consistencyWeight: number; // default 0.15
}

interface BeltThreshold {
  readonly level: Belt['level'];
  readonly minCompositeScore: number;
  readonly minStreakDays: number;
  readonly minAssessments: number;
  readonly minChallengeCompletionRate: number; // 0.0-1.0
}
```

---

## Domain Events

```typescript
interface BeltPromoted {
  readonly eventType: 'gamification.belt_promoted';
  readonly userId: string;
  readonly previousBelt: string;
  readonly newBelt: string;
  readonly timestamp: string;
}

interface MilestoneAchieved {
  readonly eventType: 'gamification.milestone_achieved';
  readonly userId: string;
  readonly milestoneType: string;
  readonly timestamp: string;
}

interface LeaderboardUpdated {
  readonly eventType: 'gamification.leaderboard_updated';
  readonly scope: string;
  readonly entriesCount: number;
  readonly timestamp: string;
}

interface ReferralConverted {
  readonly eventType: 'gamification.referral_converted';
  readonly referrerUserId: string;
  readonly referredUserId: string;
  readonly rewardMonths: number;
  readonly timestamp: string;
}
```
