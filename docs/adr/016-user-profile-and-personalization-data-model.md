# ADR-016: User Profile and Personalization Data Model

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Coach Keith AI must store and manage sensitive personal data about each user's marriage and family situation. This includes the user's wife's name, children's names and ages, marriage duration, relationship stage (newlywed, growing, struggling, rebuilding), specific challenges they are working on, and ongoing coaching context. Additionally, the AI needs a persistent "memory" of things learned about the user across conversations — preferences, breakthroughs, recurring patterns, commitments made. The data model must accommodate schema evolution as the product discovers new personalization dimensions post-launch, while still supporting efficient queries for context assembly (see ADR-011) and analytics.

**Decision:**
Adopt a hybrid data model combining relational core tables for structured, queryable data with JSONB columns for flexible, evolving profile data.

**Core Relational Tables:**

```sql
-- Structured, queryable user data
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    auth_provider VARCHAR(50) NOT NULL,  -- 'apple', 'google', 'email'
    auth_provider_id VARCHAR(255),
    subscription_tier VARCHAR(20) DEFAULT 'free_trial',  -- free_trial, standard, premium
    subscription_status VARCHAR(20) DEFAULT 'active',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription details (relational for billing queries)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,  -- active, canceled, past_due, expired
    provider VARCHAR(20) NOT NULL,  -- revenucat, stripe
    provider_subscription_id VARCHAR(255),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Flexible JSONB Profile Data:**

```sql
-- Flexible profile data that evolves with the product
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Marriage context (schema evolves frequently)
    marriage_context JSONB DEFAULT '{}'::jsonb,
    /* Example:
    {
        "wife_name": "Sarah",
        "married_years": 8,
        "marriage_stage": "growing",
        "children": [
            {"name": "Jake", "age": 5},
            {"name": "Emma", "age": 3}
        ],
        "primary_challenges": ["communication", "work-life-balance"],
        "faith_tradition": "Christian",
        "previous_counseling": true
    }
    */

    -- AI memory (accumulated insights across conversations)
    ai_memory JSONB DEFAULT '{}'::jsonb,
    /* Example:
    {
        "breakthroughs": [
            {"date": "2026-03-15", "topic": "Realized he avoids conflict"},
            {"date": "2026-03-20", "topic": "Started daily check-ins with Sarah"}
        ],
        "commitments": [
            {"made": "2026-03-18", "action": "Date night every Friday", "status": "active"}
        ],
        "patterns": ["tends to intellectualize emotions", "motivated by business analogies"],
        "coaching_notes": "Responds well to direct challenges. Avoids discussing his father."
    }
    */

    -- User preferences (UI and coaching style)
    preferences JSONB DEFAULT '{}'::jsonb,
    /* Example:
    {
        "preferred_mode": "daily_coaching",
        "notification_time": "07:00",
        "response_style": "direct",  -- direct, gentle, balanced
        "assessment_reminder_day": "sunday",
        "dark_mode": true
    }
    */

    -- Onboarding data (initial assessment responses)
    onboarding_data JSONB DEFAULT '{}'::jsonb,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**JSONB Query Patterns:**
- GIN indexes on JSONB columns for containment queries: `CREATE INDEX idx_marriage_context ON user_profiles USING GIN (marriage_context)`
- Specific path queries for analytics: `SELECT COUNT(*) FROM user_profiles WHERE marriage_context->>'marriage_stage' = 'struggling'`
- AI memory accessed as a whole document during context assembly (no partial queries needed)

**AI Memory Management:**
- AI memory is updated at the end of each conversation by a background job
- A lightweight Claude Haiku call analyzes the conversation and extracts new memory items (breakthroughs, commitments, patterns)
- Memory items include timestamps for recency-based relevance
- Memory pruning: items older than 6 months and not referenced in recent conversations are archived to a `user_profile_archive` table
- Maximum AI memory size: ~2K tokens (enforced by the memory extraction prompt)

**Data Encryption:**
- `marriage_context` and `ai_memory` columns encrypted at rest via PostgreSQL TDE or application-level encryption (AES-256)
- Column-level encryption considered for wife's name and children's names specifically
- All JSONB data excluded from full-text search indexes to prevent accidental exposure

**Consequences:**

### Pros (+)
- JSONB columns allow adding new profile fields without database migrations
- Relational core tables enable efficient queries for billing, analytics, and user management
- GIN indexes provide reasonable query performance on JSONB data
- AI memory model supports the personalization strategy described in ADR-011
- Hybrid approach is well-supported by PostgreSQL and ORMs like Prisma or Drizzle

### Cons (-)
- JSONB data lacks schema enforcement at the database level (must be validated in application code)
- Complex JSONB queries can be slower than equivalent relational queries
- No foreign key constraints within JSONB structures
- Developers must understand two different data access patterns
- JSONB schema documentation must be maintained manually (no auto-generated types from database schema)

### Tradeoffs
The primary tradeoff is **query flexibility over strict schema enforcement**. A fully relational model would provide stronger data integrity guarantees and auto-generated TypeScript types, but would require a database migration every time we discover a new personalization dimension (which will happen frequently in the first 6 months). The JSONB approach lets us iterate on the profile schema through application code changes alone, with Zod schemas providing runtime validation. This is appropriate for an MVP where the exact shape of user personalization data is still being discovered through user feedback and Keith's evolving coaching methodology.
