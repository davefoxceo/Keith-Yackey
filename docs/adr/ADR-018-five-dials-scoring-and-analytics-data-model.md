# ADR-018: Five Dials Scoring and Analytics Data Model

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Five Dials framework (Self, Marriage, Parenting, Business, Faith) is the cornerstone of Keith's coaching methodology. Users perform weekly self-assessments rating each dial from 1-10. The AI may also suggest dial adjustments based on conversational insights ("Based on what you shared about work stress, your Business dial might be lower than you rated it"). The app must display current scores as a radar chart, historical trends over time, a computed Marriage Health Score, and a Journey Map showing the user's evolution. These analytics requirements demand a data model that preserves complete assessment history while supporting efficient queries for visualization.

**Decision:**
Implement an event-sourced assessment stream in PostgreSQL (consistent with ADR-015), with materialized views optimized for the specific query patterns needed by the frontend.

**Event Stream Schema:**

```sql
CREATE TABLE assessment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    -- Event types:
    --   'weekly_assessment' - user-initiated weekly check-in
    --   'ai_suggested_adjustment' - AI proposes a dial change during conversation
    --   'ai_adjustment_accepted' - user accepts AI suggestion
    --   'ai_adjustment_rejected' - user rejects AI suggestion
    --   'manual_adjustment' - user changes a dial outside of weekly assessment
    --   'assessment_skipped' - user dismissed weekly assessment prompt
    payload JSONB NOT NULL,
    /* Payload examples:

    weekly_assessment:
    {
        "dials": {
            "self": 7, "marriage": 5, "parenting": 8, "business": 6, "faith": 4
        },
        "notes": "Tough week at work. Sarah and I had a fight about finances.",
        "mood": "stressed",
        "assessment_duration_seconds": 45
    }

    ai_suggested_adjustment:
    {
        "dial": "marriage",
        "current_score": 5,
        "suggested_score": 4,
        "reasoning": "You mentioned increased conflict and avoidance this week",
        "conversation_id": "uuid-of-source-conversation"
    }
    */
    sequence_number BIGINT NOT NULL,  -- per-user sequence for ordering
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, sequence_number)
);

-- Partition by month for query performance
CREATE TABLE assessment_events_2026_03 PARTITION OF assessment_events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE INDEX idx_assessment_events_user_time
    ON assessment_events(user_id, occurred_at DESC);
CREATE INDEX idx_assessment_events_type
    ON assessment_events(user_id, event_type, occurred_at DESC);
```

**Materialized Views:**

```sql
-- Current dial scores (refreshed on each new assessment event)
CREATE MATERIALIZED VIEW current_dial_scores AS
SELECT DISTINCT ON (user_id)
    user_id,
    (payload->'dials'->>'self')::int AS self_score,
    (payload->'dials'->>'marriage')::int AS marriage_score,
    (payload->'dials'->>'parenting')::int AS parenting_score,
    (payload->'dials'->>'business')::int AS business_score,
    (payload->'dials'->>'faith')::int AS faith_score,
    occurred_at AS assessed_at
FROM assessment_events
WHERE event_type = 'weekly_assessment'
ORDER BY user_id, occurred_at DESC;

-- Weekly trends (for chart visualization, refreshed nightly)
CREATE MATERIALIZED VIEW weekly_dial_trends AS
SELECT
    user_id,
    date_trunc('week', occurred_at) AS week_start,
    AVG((payload->'dials'->>'self')::int) AS avg_self,
    AVG((payload->'dials'->>'marriage')::int) AS avg_marriage,
    AVG((payload->'dials'->>'parenting')::int) AS avg_parenting,
    AVG((payload->'dials'->>'business')::int) AS avg_business,
    AVG((payload->'dials'->>'faith')::int) AS avg_faith,
    COUNT(*) AS assessment_count
FROM assessment_events
WHERE event_type = 'weekly_assessment'
GROUP BY user_id, date_trunc('week', occurred_at);
```

**Marriage Health Score Computation:**
The Marriage Health Score is a composite metric computed by a domain service (not stored as raw data) using the following formula:

- **Base Score:** Weighted average of current dial scores
  - Marriage dial: 35% weight
  - Self dial: 25% weight (personal growth impacts marriage)
  - Parenting dial: 15% weight
  - Faith dial: 15% weight
  - Business dial: 10% weight
- **Trend Modifier:** +/- up to 10 points based on 4-week trend direction
  - Consistent improvement across 3+ dials: +5 to +10
  - Consistent decline across 3+ dials: -5 to -10
- **Engagement Modifier:** +/- up to 5 points based on coaching engagement
  - Regular weekly assessments: +2
  - Active conversation engagement (3+ sessions/week): +3
  - Skipped assessments: -3
- **Final Score:** Clamped to 1-100 range, presented as a percentage

The Marriage Health Score is computed on-demand (not cached) to always reflect the latest data. Computation is fast (~5ms) since it reads from materialized views.

**Radar Chart Data API:**
- Endpoint: `GET /api/users/:id/dials/current`
- Returns: `{ self: 7, marriage: 5, parenting: 8, business: 6, faith: 4, healthScore: 62, assessedAt: "2026-03-22T..." }`
- Reads from `current_dial_scores` materialized view

**Trend Chart Data API:**
- Endpoint: `GET /api/users/:id/dials/trends?weeks=12`
- Returns: Array of weekly averages for all dials
- Reads from `weekly_dial_trends` materialized view

**Journey Map Data API:**
- Endpoint: `GET /api/users/:id/journey?from=2026-01-01&to=2026-03-22`
- Returns: All assessment events in range with AI adjustments and conversation references
- Reads directly from `assessment_events` table (event sourcing enables this naturally)

**Consequences:**

### Pros (+)
- Complete assessment history preserved as immutable events — Journey Map is a natural byproduct
- AI-suggested adjustments tracked alongside user assessments, enabling analysis of AI influence on scores
- Materialized views provide sub-millisecond read performance for dashboard queries
- Marriage Health Score formula can be tuned without data model changes
- Monthly partitioning keeps query performance stable as data grows
- Event stream supports future ML features (predicting score trends, identifying at-risk users)

### Cons (-)
- Materialized view refresh adds latency on assessment writes (~100-200ms)
- Marriage Health Score weights are subjective and will need calibration with Keith
- Event-sourced model is more complex than a simple `current_scores` table for developers to understand
- Monthly partitioning requires automated partition management (cron job to create future partitions)

### Tradeoffs
The primary tradeoff is **historical completeness over query simplicity**. A simpler approach would store only current dial scores in a single row per user, with a separate history table for past assessments. But this would lose the rich event semantics (AI suggestions, acceptance/rejection tracking, assessment skips) that make the Journey Map and AI feedback analysis possible. The event-sourced model treats assessment history as a first-class product feature rather than a logging afterthought, which aligns with Keith's emphasis on tracking the full journey of personal growth.
