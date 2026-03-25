# ADR-015: Event Sourcing Strategy

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
Several features in Coach Keith AI are inherently historical: the Journey Map visualizes a user's evolution over time, the Five Dials feature tracks score changes across weekly assessments, and the engagement analytics system needs a complete record of user interactions. Event sourcing — where state changes are stored as an immutable sequence of events rather than mutable current state — is a natural fit for these use cases. However, applying event sourcing universally (full CQRS/ES architecture) introduces significant complexity for domains where history is not a core feature (e.g., user authentication, subscription management, content catalog). The team must balance architectural purity against practical development velocity for an MVP.

**Decision:**
Apply event sourcing selectively to two bounded contexts where historical data IS the feature, while using standard CRUD with audit logging for all other contexts.

**Event-Sourced Contexts:**

1. **Assessment Context (Five Dials):**
   - Every dial assessment stored as an immutable event in `assessment_events` table
   - Event schema: `id` (UUID), `user_id`, `event_type` (e.g., `dials_assessed`, `dial_adjusted_by_ai`, `assessment_skipped`), `payload` (JSONB containing dial scores, source, notes), `occurred_at`, `sequence_number`
   - Current dial state derived by replaying events (materialized in a `current_dial_scores` view for fast reads)
   - Supports Journey Map feature: query event stream to render score evolution over time
   - Marriage Health Score computed by a domain service that reads the current materialized state

2. **Engagement Context (Conversations and Interactions):**
   - User engagement events: `conversation_started`, `message_sent`, `message_received`, `mode_switched`, `feedback_given`, `resource_shared`, `assessment_prompted`
   - Event schema: `id`, `user_id`, `session_id`, `event_type`, `payload` (JSONB), `occurred_at`, `sequence_number`
   - Enables engagement analytics: streak calculations, session frequency, preferred modes, peak usage times
   - Supports future gamification features (badges, milestones) by querying historical event patterns

**Event Store Implementation:**
- PostgreSQL tables with append-only semantics (no UPDATE or DELETE operations, enforced via database policies)
- Partitioned by month for performance (`assessment_events_2026_03`, etc.)
- Sequence numbers per user for ordering guarantees (no global sequence to avoid contention)
- Indexes: `(user_id, occurred_at)` for time-range queries, `(user_id, event_type)` for filtered queries
- Retention: events retained indefinitely (they are the source of truth)

**Materialized Views for Read Performance:**
- `current_dial_scores`: latest dial values per user, refreshed on each new assessment event
- `weekly_engagement_summary`: aggregated engagement metrics per user per week
- `user_streaks`: current and longest streaks, updated on each conversation event
- Views refreshed synchronously on write (acceptable at MVP scale) or via background job if latency becomes an issue

**CRUD Contexts (with Audit Logging):**
- User profiles, authentication, subscriptions, content catalog, prompt templates
- Standard PostgreSQL tables with `created_at`, `updated_at` columns
- Audit log table: `audit_log` with `table_name`, `record_id`, `action` (INSERT/UPDATE/DELETE), `old_values` (JSONB), `new_values` (JSONB), `performed_by`, `occurred_at`
- Audit logging implemented via PostgreSQL triggers (automatic, no application code required)

**Consequences:**

### Pros (+)
- Assessment history is first-class data, enabling Journey Map and trend features without additional work
- Engagement event stream provides rich analytics data for product decisions
- Immutable events provide a complete audit trail for debugging and compliance
- Materialized views give fast read performance without sacrificing event sourcing benefits
- CRUD contexts remain simple and familiar for the development team
- PostgreSQL triggers handle audit logging automatically, reducing application complexity

### Cons (-)
- Two different data patterns (event sourcing and CRUD) increase cognitive load for developers
- Event schema evolution requires careful versioning (adding new event types is easy; changing existing event shapes is hard)
- Materialized view refresh adds write latency for event-sourced contexts
- No built-in event replay tooling — must build custom replay scripts for state reconstruction

### Tradeoffs
The primary tradeoff is **selective event sourcing over full CQRS everywhere**. A purist CQRS/ES architecture would apply event sourcing to every bounded context, with separate read and write models, event buses, and projections. While architecturally elegant, this would triple the development effort for contexts (auth, subscriptions, content) where a simple `UPDATE users SET name = 'foo'` is entirely sufficient. By limiting event sourcing to contexts where history is the feature, we get the benefits where they matter most while keeping the rest of the system approachable and fast to develop.
