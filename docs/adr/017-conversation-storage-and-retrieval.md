# ADR-017: Conversation Storage and Retrieval

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
Conversations are the primary interaction model in Coach Keith AI. Every coaching exchange must be persisted for context continuity (users returning to continue a topic), AI context assembly (feeding conversation history into prompts), analytics (understanding engagement patterns), and compliance (audit trail of AI-generated advice). The system supports multiple conversation modes (Daily Coaching, Deep Dive, Ask Keith, Marriage Meeting Prep, Emergency SOS) and users may switch between modes within a session. Conversations can span multiple sessions (a user starts a topic Monday morning and continues Monday evening). The storage model must handle these requirements while remaining simple enough for an MVP timeline.

**Decision:**
Use PostgreSQL with a two-table model: `conversations` for metadata and session management, and `messages` for individual message content.

**Schema Design:**

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode VARCHAR(50) NOT NULL,  -- daily_coaching, deep_dive, ask_keith, marriage_meeting_prep, emergency_sos
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, completed, archived
    title VARCHAR(255),  -- AI-generated title after 3+ exchanges
    summary TEXT,  -- AI-generated summary on completion/archival
    safety_flag VARCHAR(20),  -- null, sensitive, crisis
    message_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,  -- mode-specific data, feature flags, prompt version
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- user, assistant, system
    content TEXT NOT NULL,
    token_count INTEGER,  -- pre-computed for context budget management
    safety_classification VARCHAR(20),  -- safe, sensitive, crisis, out_of_scope
    rag_sources JSONB,  -- references to content chunks used for this response
    model_id VARCHAR(100),  -- claude-sonnet-4-20250514, etc.
    prompt_version VARCHAR(20),  -- links to prompt registry
    latency_ms INTEGER,  -- response generation time
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_conversations_user_active ON conversations(user_id, status) WHERE status = 'active';
CREATE INDEX idx_conversations_user_mode ON conversations(user_id, mode, status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_safety ON messages(safety_classification) WHERE safety_classification IS NOT NULL;
```

**Conversation Lifecycle:**
1. **Start:** When a user opens a mode, check for an existing active conversation in that mode. If one exists and `last_message_at` is within 4 hours, resume it. Otherwise, complete the old conversation and start a new one.
2. **Active:** Messages appended to the `messages` table. `conversation.message_count` and `last_message_at` updated on each exchange. After 3 exchanges, a title is generated via Claude Haiku and stored.
3. **Complete:** Triggered by user action ("End conversation"), session timeout (4 hours of inactivity), or mode switch. An AI-generated summary (200-300 tokens) is stored in `conversations.summary`. Status set to `completed`.
4. **Archive:** Completed conversations older than 90 days are archived. Messages remain in the database but are excluded from standard queries. Summary and metadata retained for analytics.

**One Active Conversation Per Mode:**
- Enforced at the application level (not database constraint, for flexibility)
- A user can have one active Daily Coaching conversation AND one active Deep Dive conversation simultaneously
- Mode switching completes the current conversation in the old mode (with summary) and starts/resumes one in the new mode
- Emergency SOS mode always creates a new conversation, never resumes

**Context Retrieval for AI Prompts:**
- Query: `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 20`
- Application applies sliding window logic (last 10 exchanges verbatim, older summarized per ADR-011)
- Pre-computed `token_count` on each message enables efficient context budget calculation without re-tokenizing

**Conversation Summary Generation:**
- Triggered asynchronously when conversation is completed
- Claude Haiku prompt: "Summarize this coaching conversation in 2-3 sentences. Include: main topic discussed, key insights or breakthroughs, any commitments the user made."
- Summary stored in `conversations.summary` and available for future context assembly (e.g., "In your last conversation, you discussed...")

**Consequences:**

### Pros (+)
- Simple two-table model is easy to understand, query, and maintain
- PostgreSQL handles the expected message volume comfortably (millions of messages)
- Pre-computed token counts eliminate redundant tokenization during context assembly
- Conversation summaries enable cross-session continuity without loading full history
- Safety classification on messages enables targeted human review (ADR-013)
- RAG source tracking on messages provides transparency and debugging capability

### Cons (-)
- No real-time streaming support — messages are stored after full generation (acceptable for MVP)
- Large conversations (100+ messages) may have slower archival summary generation
- No built-in full-text search on message content (can add `tsvector` column if needed later)
- Single-database model means conversation queries compete with other workloads

### Tradeoffs
The primary tradeoff is **simplicity over real-time streaming capabilities**. A production chat system might use WebSockets with a message broker (Redis Pub/Sub, Kafka) for real-time delivery and a separate search index (Elasticsearch) for message search. For Coach Keith AI, where conversations are turn-based (user sends message, waits for AI response) rather than real-time multi-party chat, the simple request-response model with PostgreSQL storage is entirely sufficient. Streaming of AI responses to the client is handled at the API layer (Server-Sent Events from the Claude API response) without impacting storage — the full response is written to the database once generation is complete.
