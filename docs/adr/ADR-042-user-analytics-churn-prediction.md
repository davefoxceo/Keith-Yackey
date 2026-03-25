# ADR-042: User Analytics and Churn Prediction

**Status:** Proposed
**Date:** 2026-03-24

## Context

Coach Keith AI needs to understand how users engage with the platform to make product decisions, identify at-risk users before they churn, and give Keith visibility into aggregate coaching outcomes. Currently there is no event tracking -- we cannot answer basic questions like "how many users completed an assessment this week?" or "which users haven't logged in for 5 days?"

Marriage coaching is a high-churn category. Users often sign up motivated, engage for 1-2 weeks, then drop off. The cost of acquiring a new subscriber is significantly higher than the cost of retaining an existing one. Early churn detection lets us intervene with targeted re-engagement (see ADR-041) before the user mentally cancels.

Privacy is a core concern. Marriage coaching data is deeply personal. We must track behavioral events (what actions were taken) without storing conversation content in analytics. No third-party analytics tools at launch to avoid sending user behavior data to external services.

## Decision

Build an **in-house event tracking system** with a simple churn prediction heuristic, stored alongside existing user data in DataStore.

### Events to Track

| Event | Payload | When |
|-------|---------|------|
| `login` | `{ timestamp, device_type }` | User opens app or returns from idle |
| `message_sent` | `{ timestamp, conversation_id, model_tier }` | User sends a message to Coach Keith |
| `assessment_completed` | `{ timestamp, scores: { faith, fitness, finances, family, fun } }` | User submits Five Dials assessment |
| `content_viewed` | `{ timestamp, content_id, content_type, duration_seconds }` | User views an episode, resource, or challenge |
| `challenge_started` | `{ timestamp, challenge_id }` | User begins a new challenge |
| `challenge_completed` | `{ timestamp, challenge_id, days_completed }` | User finishes a challenge |
| `feedback_given` | `{ timestamp, type: 'thumbs_up' | 'thumbs_down', message_id }` | User rates a Coach Keith response |
| `streak_day` | `{ timestamp, streak_count }` | User maintains their daily streak |
| `subscription_event` | `{ timestamp, action: 'created' | 'renewed' | 'cancelled' | 'failed' }` | Stripe webhook events |
| `notification_interaction` | `{ timestamp, notification_type, action: 'received' | 'clicked' | 'dismissed' }` | User interacts with a push notification |

### Storage Design

Events are stored as append-only JSON in the user's DataStore directory:

```
data/users/{user_id}/events.json
```

Each file contains an array of event objects, newest last. The file is append-only in normal operation (new events are pushed to the array). For users with very high activity, events older than 90 days are archived to a separate `events-archive-{year}-{quarter}.json` file.

This approach avoids adding a new database dependency. When we outgrow it, events can be exported to BigQuery (see Future section).

### Aggregate Metrics

The analytics service computes these metrics on demand (cached for 1 hour):

| Metric | Definition | Purpose |
|--------|-----------|---------|
| **DAU** | Distinct users with a `login` event today | Daily active users |
| **WAU/MAU** | Distinct users with a `login` event in last 7/30 days | Weekly/monthly active |
| **Messages per user per week** | Count of `message_sent` events per user in trailing 7 days | Engagement depth |
| **Assessment completion rate** | Users who completed assessment / users who logged in, per day | Core feature adoption |
| **Average session length** | Time between first and last event per login session | Session engagement |
| **Streak distribution** | Histogram of current streak lengths across all users | Retention health |
| **Content engagement** | Views and average duration per content item | Content effectiveness |

### Churn Prediction Heuristic

A simple rules-based classifier that runs nightly and flags at-risk users:

```
User is AT RISK if ANY of:
  - No login in 5+ days AND had been active (3+ logins in prior 2 weeks)
  - Dial scores declining for 3 consecutive assessments (average score dropping)
  - No messages sent in 7+ days AND previously sent 2+ messages/week
  - Streak broken after 7+ day streak (high-value streak loss)
  - Subscription renewal in next 7 days AND engagement score below threshold
```

**Engagement score** is a weighted composite:
- Login recency (0-30 points): 30 if today, -3 per day since last login
- Message frequency (0-25 points): based on messages in last 14 days vs. user's personal average
- Assessment consistency (0-25 points): based on assessments completed in last 14 days
- Streak status (0-20 points): 20 if active streak > 7 days, 10 if 3-7, 0 if broken

Users with engagement score below 30 (out of 100) are flagged as at-risk.

### At-Risk User Actions

When a user is flagged at-risk:
1. Add `at_risk: true` flag and `at_risk_reason` to their profile
2. Trigger re-engagement notification (ADR-041): email with personalized content based on their last activity
3. Surface in admin dashboard with reason and last activity date
4. If user has upcoming renewal and is at-risk, Keith can receive an alert to personally reach out

### Admin Dashboard Metrics

Keith's admin view shows:
- Total active users (DAU/WAU/MAU) with trend
- At-risk users list with reason and last activity
- Aggregate dial score trends (anonymized: average scores across all users per week)
- Top-performing content (most viewed, highest completion)
- Churn rate: users who cancelled or went inactive / total users, per month
- Revenue metrics: MRR, new subscriptions, cancellations (from Stripe data)

Individual user data (specific dial scores, conversation topics) is NOT shown in aggregate views. Keith sees aggregate trends only unless he looks up a specific user in the coaching context.

## Implementation

```
src/services/analytics.service.ts        -- event ingestion and query
src/services/churn-predictor.service.ts   -- nightly churn scoring
src/jobs/churn-prediction.job.ts          -- cron job (runs at 2am daily)
src/controllers/admin-analytics.ctrl.ts   -- admin API endpoints
```

### Event Ingestion

`AnalyticsService.track(userId, eventType, payload)` -- appends to the user's events file. Non-blocking (fire and forget from the calling code). Buffers writes to avoid excessive file I/O (flush every 5 seconds or 10 events, whichever comes first).

## Consequences

### Positive

- Product decisions backed by data rather than assumptions
- At-risk users identified before they churn, enabling proactive intervention
- Keith gets visibility into aggregate coaching effectiveness
- No third-party data sharing -- all analytics stay in-house
- Simple implementation that can evolve (BigQuery export path exists)

### Negative

- JSON file-based storage will not scale past ~5,000 active users efficiently
- Heuristic churn prediction has false positives (vacation, busy week misidentified as churn)
- No real-time analytics dashboard (metrics cached for 1 hour)
- Manual schema evolution -- adding new event types requires code changes

### Mitigations

- Plan migration to BigQuery or Cloud SQL events table at 2,000 users
- Allow users flagged as at-risk to be manually dismissed by Keith in admin dashboard
- Include "snooze" option for at-risk flags (user on vacation, temporarily inactive by choice)
- Future: replace heuristic with ML model trained on actual churn outcomes once sufficient data exists
