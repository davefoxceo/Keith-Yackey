# ADR-032: Private Pi-Brain for Local Persistence and SONA Learning

**Status:** Proposed
**Date:** 2026-03-23
**Supersedes:** ADR-006 (Vector Store Selection — pgvector)
**Related:** ADR-004 (Database), ADR-009 (RAG Pipeline), ADR-010 (Embeddings)

---

## Context

Coach Keith AI currently stores all data in JavaScript in-memory Maps. User accounts, conversations, coaching feedback, and learning signals are lost when the API process restarts. The only persistent data is Keith's 158-entry knowledge base, which is baked into TypeScript seed files and reloaded on startup.

We need a persistence layer that:

1. Survives process restarts during development
2. Stores Keith's coaching knowledge base with HNSW vector search
3. Stores user conversations with strict user-scoped isolation
4. Enables SONA self-learning (adaptive LoRA weights, trajectory tracking)
5. Runs locally during development at zero cost
6. Migrates to Google Cloud for production with minimal code changes
7. Exposes tools Claude can use directly via MCP

After evaluating raw RVF files, the global Pi-Brain (pi.ruv.io), pgvector, and managed vector databases (Pinecone, Qdrant), we propose a **private Pi-Brain instance** — the same codebase as pi.ruv.io but running locally and deploying to our own isolated Google Cloud project.

---

## Decision

**Deploy a private Pi-Brain instance as the unified persistence and learning layer for Coach Keith AI.**

This replaces:
- The `InMemoryVectorStore` (JavaScript cosine similarity)
- The `LearningService` in-memory stores
- The proposed pgvector setup from ADR-006
- Any need for a separate Redis cache for session data

### Architecture

```
┌─────────────────────────────────────────────────┐
│  Coach Keith API (NestJS)                       │
│                                                 │
│  CoachingService ──► MCP Tools ──► Pi-Brain     │
│  AuthService     ──► MCP Tools ──► Pi-Brain     │
│  LearningService ──► MCP Tools ──► Pi-Brain     │
└─────────────────────────┬───────────────────────┘
                          │ MCP (stdio local / SSE cloud)
                          ▼
┌─────────────────────────────────────────────────┐
│  Private Pi-Brain Instance                      │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ Keith Content │  │ User Data    │             │
│  │ (shared,      │  │ (scoped by   │             │
│  │  read-mostly) │  │  contributor)│             │
│  └──────────────┘  └──────────────┘             │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ SONA Engine  │  │ HNSW Index   │             │
│  │ (learning)   │  │ (search)     │             │
│  └──────────────┘  └──────────────┘             │
│                                                 │
│  Storage: DashMap (dev) │ Firestore+GCS (prod)  │
│  Format: RVF containers internally              │
└─────────────────────────────────────────────────┘
```

### Development Mode (Local)

```
FIRESTORE_URL=        (not set — local-only mode)
PI_BRAIN_TRANSPORT=   stdio
PI_BRAIN_BINARY=      ./bin/mcp-brain
```

- Pi-Brain runs as a local sidecar process via MCP stdio transport
- All data stored in DashMap (in-process memory) with optional RVF file snapshots
- 22 MCP tools available to the Coach Keith API
- SONA engine runs locally, learning from this developer's sessions
- Zero cloud cost

### Production Mode (Google Cloud)

```
FIRESTORE_URL=        https://firestore.googleapis.com/v1/projects/coach-keith-prod
GCS_BUCKET=           coach-keith-brain
GOOGLE_PROJECT_ID=    coach-keith-prod
PI_BRAIN_TRANSPORT=   sse
PI_BRAIN_URL=         https://brain.coachkeith.app/sse
```

- Pi-Brain deployed as Cloud Run service in our own GCP project
- Dual-write: DashMap (hot cache) + Firestore (durable)
- RVF containers stored in GCS for large binary assets
- Scale-to-zero: no cost when idle
- Auto-scales to handle concurrent users
- SONA learning accumulates across all user sessions

---

## Bounded Contexts (DDD)

### 1. Coaching Knowledge Context

**Aggregate Root:** `CoachingContent`

| Entity | Storage | Isolation | MCP Tool |
|--------|---------|-----------|----------|
| Keith's frameworks (17 entries) | `brain_share` | Shared (read-only) | `brain_share`, `brain_search` |
| Podcast content (113 chunks) | `brain_share` | Shared (read-only) | `brain_share`, `brain_search` |
| Guest appearance notes (17 entries) | `brain_share` | Shared (read-only) | `brain_share`, `brain_search` |
| Private Money relevant (11 entries) | `brain_share` | Shared (read-only) | `brain_share`, `brain_search` |

**Invariant:** Content is immutable once ingested. New content is appended, never overwritten.
**Search:** `brain_search` with HNSW index for semantic similarity retrieval.

### 2. User Conversation Context

**Aggregate Root:** `UserConversation`

| Entity | Storage | Isolation | MCP Tool |
|--------|---------|-----------|----------|
| Conversation sessions | `brain_page_create` | Per-user (contributor namespace) | `brain_page_create`, `brain_page_get` |
| Message history | `brain_page_delta` | Per-conversation | `brain_page_delta`, `brain_page_deltas` |
| Conversation embeddings | `brain_share` (namespaced) | Per-user prefix filter | `brain_share`, `brain_search` |

**Invariant:** A user can ONLY access conversations where their userId matches the contributor namespace. Enforced by Pi-Brain's contributor isolation.
**Event:** `ConversationCompleted` → triggers embedding storage + SONA trajectory end.

### 3. Learning & Adaptation Context

**Aggregate Root:** `UserLearningProfile`

| Entity | Storage | Isolation | MCP Tool |
|--------|---------|-----------|----------|
| Feedback signals | `brain_vote` | Per-user | `brain_vote` |
| SONA trajectories | Automatic (internal) | Per-session | `brain_sync` |
| MicroLoRA weights | `brain_sync` | Aggregated (privacy-safe) | `brain_sync` |
| Learning metrics | `brain_status` | System-wide | `brain_status` |

**Invariant:** Individual conversation content is NEVER included in shared learning. Only abstract quality signals and LoRA weight deltas cross user boundaries.
**Policy:** Bayesian quality scoring — high-rated responses strengthen patterns; low-rated responses trigger pattern revision.

### 4. User Identity Context

**Aggregate Root:** `UserAccount`

| Entity | Storage | Isolation | MCP Tool |
|--------|---------|-----------|----------|
| User profile | `brain_page_create` | Per-user | `brain_page_create`, `brain_page_get` |
| Auth credentials | `brain_page_create` (encrypted) | Per-user | `brain_page_get` |
| Subscription status | `brain_page_create` | Per-user | `brain_page_get`, `brain_page_delta` |

**Invariant:** Password hashes stored encrypted. Auth tokens are ephemeral (JWT, not persisted in brain).

---

## MCP Tool Mapping

The 22 Pi-Brain MCP tools map to Coach Keith operations:

| Coach Keith Operation | MCP Tool | Notes |
|---|---|---|
| Load Keith's knowledge base | `brain_share` | One-time ingestion of 158 entries |
| Search for relevant coaching content | `brain_search` | RAG retrieval before every AI response |
| Store a conversation | `brain_page_create` | After conversation starts |
| Add a message to conversation | `brain_page_delta` | After each exchange |
| Retrieve conversation history | `brain_page_get` + `brain_page_deltas` | When loading a past conversation |
| Submit feedback (thumbs up/down) | `brain_vote` | Feeds into SONA quality scoring |
| Check embedding freshness | `brain_drift` | Detect when content needs re-embedding |
| Transfer coaching patterns | `brain_transfer` | Apply patterns from one coaching domain to another |
| Sync learning weights | `brain_sync` | Federated MicroLoRA weight synchronization |
| Get system health | `brain_status` | Monitoring dashboard |
| Promote a coaching insight | `brain_page_promote` | Surface high-quality coaching patterns |
| Cite evidence for advice | `brain_page_evidence` | Link coaching advice back to Keith's source content |

---

## User Isolation Guarantees

| Layer | Mechanism | Enforcement |
|---|---|---|
| **API** | JWT auth + `userId` check on every endpoint | NestJS guards, `@CurrentUser` decorator |
| **MCP** | Contributor namespace prefix on all user data | Pi-Brain contributor isolation |
| **Storage** | Firestore document-level security rules (prod) | Google Cloud IAM |
| **Learning** | Only abstract quality signals cross user boundaries | SONA federated aggregation with differential privacy |
| **Search** | Prefix filter on `brain_search` for user-scoped data | Same as current `user:{id}:` prefix pattern |

**Guarantee:** No user can ever retrieve, read, or influence another user's conversation data. Keith's coaching content is shared because it's public teaching material. SONA learning shares only abstract weight deltas, never conversation content.

---

## Migration Plan

### Phase 1: Local Development (Immediate)

1. Build or download the `mcp-brain` binary for macOS ARM64
2. Add Pi-Brain as MCP server in `.mcp.json` (stdio transport)
3. Replace `InMemoryVectorStore` calls with MCP tool calls
4. Migrate Keith's 158 content entries via `brain_share`
5. Migrate conversation storage to `brain_page_create`/`brain_page_delta`
6. Wire feedback to `brain_vote`
7. Enable SONA engine in local mode
8. Verify data persists across API restarts

**Estimated effort:** 3-5 days
**Cost:** $0

### Phase 2: Cloud Deployment (When Ready)

1. Create GCP project `coach-keith-prod`
2. Create Firestore database + GCS bucket
3. Deploy `ruvbrain` as Cloud Run service
4. Set env vars (FIRESTORE_URL, GCS_BUCKET, GOOGLE_PROJECT_ID)
5. Switch MCP transport from stdio to SSE
6. Migrate local brain data to cloud via `brain_sync`
7. Point Coach Keith API at cloud Pi-Brain URL
8. Configure Cloud Run auto-scaling (0-10 instances)

**Estimated effort:** 1-2 weeks
**Cost:** ~$100-200/month (scale-to-zero when idle)

### Phase 3: WASM on iPhone (Future)

1. Compile RVF reader to WASM (5.5KB microkernel)
2. Ship Keith's knowledge base as cached RVF file in PWA
3. Local HNSW search on-device for RAG
4. Server becomes thin Claude API proxy only
5. User data stored in IndexedDB + local RVF
6. Optional sync to cloud Pi-Brain when online

**Estimated effort:** 2-4 weeks
**Cost:** Reduces server cost significantly (vector search moves client-side)

---

## Consequences

### Positive

- All data persists across restarts (immediate development benefit)
- SONA self-learning enabled (coaching AI improves with every session)
- Same code runs locally and in cloud (no migration rewrite)
- 22 MCP tools provide a rich, tested API surface
- RVF format underneath means data is portable and future-proof
- User isolation maintained at every layer
- Cloud deployment is an env var change, not an architecture change

### Negative

- Dependency on the Pi-Brain/Ruvector ecosystem (though data is exportable via RVF)
- Requires compiling or obtaining the `mcp-brain` Rust binary for local development
- Adds a sidecar process to the development environment
- MCP tool calls add ~1-5ms latency vs direct in-memory access (negligible)

### Neutral

- Supersedes ADR-006 (pgvector) — pgvector may still be useful for relational queries but is no longer the vector store
- The `InMemoryVectorStore` and `LearningService` code remains as a fallback if Pi-Brain is unavailable
- Claude API remains the AI response engine — Pi-Brain handles storage and learning, not generation

---

## References

- Ruvector ADR-001: Core architecture
- Ruvector ADR-006: Memory management (tiered storage)
- Ruvector ADR-029: RVF canonical format
- Ruvector ADR-030: RVF cognitive containers
- Ruvector ADR-059: Shared brain on Google Cloud
- Ruvector ADR-060: Shared brain capabilities (22 MCP tools)
- Ruvector ADR-064: Pi-Brain infrastructure
- Ruvector ADR-066: SSE/MCP transport
- Ruvector ADR-094: Shared web memory (browser persistence)
- Coach Keith ADR-006: Vector store selection (superseded)
- Coach Keith ADR-009: RAG pipeline architecture
- Research: `docs/research/persistence-strategy-proposal.md`
