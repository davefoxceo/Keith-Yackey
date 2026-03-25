# ADR-046: Leaderboard System

**Status:** Proposed
**Date:** 2026-03-24

## Context

The Coach Keith AI app currently tracks individual user metrics -- leading score, lagging score, streak, belt level -- but there is no mechanism for users to see how they compare to other men in the brotherhood. Keith's in-person coaching groups thrive on friendly competition and mutual accountability. When men see other men showing up consistently, it raises the bar for everyone.

A leaderboard system introduces healthy competition into the app while reinforcing the brotherhood dynamic. The design must balance motivation through competition with privacy -- not every man wants his scores visible to others, and some of the underlying data (like the lagging/intimacy score) is deeply personal.

## Decision

Build a **composite-score leaderboard** with weekly and all-time rankings, privacy controls, and a brotherhood (friends-only) view.

### Composite Score Algorithm

The leaderboard rank is determined by a composite score that weights multiple dimensions of engagement:

```
composite_score = (leading_score * 0.4)
                + (streak_days * 0.2)
                + (belt_numeric * 0.2)
                + (consistency_pct * 0.2)
```

| Component | Weight | Range | Description |
|-----------|--------|-------|-------------|
| **Leading Score** | 40% | 0-35 | Current week's Five Dials total (normalized to 0-100) |
| **Streak Days** | 20% | 0-365+ | Consecutive days of check-in (capped at 100 for scoring) |
| **Belt Numeric** | 20% | 1-10 | Numeric value of current belt (White=1 through Black=10) |
| **Consistency %** | 20% | 0-100 | Percentage of weeks in the last 12 where all 5 assessments were completed |

Normalization: each component is scaled to 0-100 before weighting, producing a final composite score of 0-100.

### Leaderboard Views

#### 1. Weekly Top 20

- Recalculated every Monday at midnight UTC
- Shows rank, display name, composite score, belt badge, streak flame icon
- Resets each week so new users can compete immediately
- Weekly view uses only that week's leading score (not rolling average)

#### 2. All-Time Top 20

- Cumulative composite score averaged over total weeks active
- Rewards long-term consistency over single-week spikes
- Updated daily at 2am UTC

#### 3. Brotherhood (Friends Only)

- Users can add friends by sharing a friend code (similar to referral code)
- Brotherhood leaderboard shows only connected friends
- No minimum -- even 2 friends creates a meaningful leaderboard
- This is the default view for users who have at least one friend connected

### Privacy Controls

| Setting | Options | Default |
|---------|---------|---------|
| **Display name** | Real first name, custom nickname, or anonymous | First name |
| **Anonymous mode** | "Anonymous Warrior #[random]" replaces name | Off |
| **Leaderboard visibility** | Public (all views), Brotherhood only, Hidden | Public |
| **Score detail** | Show full breakdown or composite only | Composite only |

- Lagging score (intimacy) is NEVER shown on leaderboards -- it is excluded from the composite score entirely
- Users who choose "Hidden" are excluded from public and brotherhood boards but can still see their own rank position ("You would be #7 this week")

### Gamification Rewards

| Achievement | Reward |
|-------------|--------|
| Top 3 weekly finish | Special weekly badge displayed on profile |
| #1 weekly finish | "Man of the Week" badge + Keith shoutout (automated message from Keith's AI) |
| Monthly winner (most #1 weekly finishes) | "Man of the Month" badge + shoutout in Keith's content |
| 4 consecutive top-10 finishes | "Consistent Warrior" badge |
| First time entering top 20 | "Rising" badge |

Keith sees real names and full score breakdowns for all users in the admin dashboard, regardless of their privacy settings. This allows him to identify men who are showing up and personally acknowledge them.

### Data Storage and Calculation

- Composite scores stored in DataStore with daily snapshots
- Weekly leaderboard calculated by a scheduled job every Monday at midnight UTC
- All-time leaderboard recalculated daily at 2am UTC
- Historical rankings preserved for trend analysis ("You've improved from #45 to #12 over the last month")
- Leaderboard data cached with 1-hour TTL to reduce DataStore reads

### Display Locations

- **Brotherhood page**: full leaderboard with tab switcher (Weekly / All-Time / Friends)
- **Dashboard sidebar widget**: compact view showing user's current rank and top 3
- **Profile page**: user's ranking history chart (line graph of weekly rank over time)

## Implementation

```
src/services/leaderboard.service.ts    -- score calculation, ranking, caching
src/services/friendship.service.ts     -- friend code system, brotherhood connections
src/models/leaderboard.model.ts        -- composite score, ranking, badge types
src/components/leaderboard.tsx         -- full leaderboard page with views
src/components/leaderboard-widget.tsx  -- dashboard sidebar compact view
```

### LeaderboardService API

- `calculateCompositeScore(userId) -> number` -- computes current composite score
- `getWeeklyLeaderboard(limit?) -> RankedUser[]` -- returns weekly top N
- `getAllTimeLeaderboard(limit?) -> RankedUser[]` -- returns all-time top N
- `getBrotherhoodLeaderboard(userId, limit?) -> RankedUser[]` -- returns friends-only ranking
- `getUserRank(userId, view) -> { rank: number, score: number, trend: string }` -- user's position
- `addFriend(userId, friendCode) -> void` -- connects two users for brotherhood view
- `awardBadges() -> void` -- runs after weekly recalculation, assigns earned badges

## Consequences

### Positive

- Introduces healthy competition that mirrors the energy of Keith's in-person groups
- Brotherhood view creates accountability pairs and small-group dynamics
- Privacy controls respect the sensitive nature of the coaching data
- Weekly resets keep the leaderboard accessible to newer users
- Badge system provides additional gamification without being childish

### Negative

- Leaderboards can demotivate users who consistently rank low
- Composite score algorithm may need rebalancing as usage patterns emerge
- Brotherhood/friend system adds social graph complexity to a coaching app
- Users gaming the system (e.g., checking in without genuine engagement) to boost scores

### Mitigations

- Users who rank in the bottom quartile see encouraging messaging instead of rank number ("Keep showing up -- you're building momentum")
- A/B test the composite score weights during the first 90 days and adjust based on user feedback
- Friend connections are mutual (both must accept) to prevent unwanted social pressure
- Monitor for anomalous check-in patterns (e.g., completing assessment in under 5 seconds) and flag for review
