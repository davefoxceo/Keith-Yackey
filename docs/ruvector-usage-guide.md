# Ruvector Usage Guide

> **Copy this file into any new project at `docs/ruvector-usage-guide.md`.**
> It explains the architecture, tells your AI assistant what to use and what NOT to use,
> and provides copy-paste code examples for the most common patterns.

---

## Quick Start (Read This First)

### What Ruvector Is

Ruvector is a **self-contained AI infrastructure stack** written in Rust. It provides vector storage, HNSW search, embeddings, self-learning (SONA), and persistence — all without external databases. One npm package replaces PostgreSQL + pgvector + Pinecone + Redis + a custom embedding pipeline.

### What To Install

```bash
npm install @ruvector/node     # Node.js — full HNSW + REDB persistence + SIMD
# OR
npm install @ruvector/wasm     # Browser — in-memory + IndexedDB persistence
```

### What NOT To Do

- **Do NOT install pgvector.** Ruvector has its own HNSW implementation.
- **Do NOT install PostgreSQL for vector search.** Ruvector stores vectors in REDB (a single `.db` file).
- **Do NOT write your own vector store.** Ruvector already has one.
- **Do NOT write your own embedding function.** Use `ruvllm` (built into the MCP brain server) or Ruvector's built-in embedding support.
- **Do NOT use Pinecone, Qdrant, Weaviate, or Chroma.** Ruvector replaces all of them.
- **Do NOT use the `mcp-brain` npm package for vector search.** That's a separate product that wraps pgvector. Use `@ruvector/node` directly, or the Rust `mcp-brain-server` (which uses Ruvector natively).

### The Confusion To Avoid

There are **two different things called "mcp-brain"**:

| | npm `mcp-brain` | Rust `mcp-brain-server` |
|---|---|---|
| **Language** | Rust binary published to npm | Rust crate in ruvector repo |
| **Vector engine** | pgvector (PostgreSQL extension) | Ruvector native (DashMap + brute-force cosine) |
| **Storage** | PostgreSQL | DashMap (hot) + Firestore (persistent) |
| **SONA** | No | Yes |
| **Dependencies** | PostgreSQL + pgvector | None (local-only mode) or Firestore |
| **Use for** | General MCP memory server | Ruvector ecosystem brain |

**For Ruvector projects, use `@ruvector/node` for vector operations and the Rust `mcp-brain-server` for the brain layer.**

---

## Architecture

### The Ruvector Stack

```
┌─────────────────────────────────────────────┐
│  Your Application (Node.js / Browser / Rust) │
└────────────────────┬────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   @ruvector/node            mcp-brain-server
   (vector operations)       (brain + learning)
        │                         │
   ┌────┴────┐              ┌─────┴─────┐
   │ruvector  │              │ ruvector   │
   │  -core   │              │   -sona    │
   │         │              │ ruvllm     │
   │ HNSW    │              │ rvf-*      │
   │ REDB    │              │ mincut     │
   │ SIMD    │              │ solver     │
   └─────────┘              └───────────┘
        │                         │
   data/vectors.db           Firestore (prod)
   (single file)             DashMap (dev)
```

### What Each Layer Does

| Layer | What It Does | Storage | Needs External DB? |
|---|---|---|---|
| `@ruvector/node` | Vector CRUD + HNSW search + SIMD distance | REDB (`.db` file) | **No** |
| `@ruvector/wasm` | Same but in browser, flat index (no HNSW) | IndexedDB | **No** |
| `ruvector-core` (Rust) | The engine underneath both npm packages | REDB or in-memory | **No** |
| `ruvector-sona` | Self-learning (LoRA, EWC++, ReasoningBank) | In-memory | **No** |
| `ruvllm` | Embeddings (HashEmbedder, RlmEmbedder) | None (pure compute) | **No** |
| `mcp-brain-server` (Rust) | 22 MCP tools, graph, knowledge management | DashMap + Firestore | Firestore optional |
| `ruvector-postgres` | PostgreSQL extension exposing Ruvector as SQL | PostgreSQL | Yes (but this is optional) |
| RVF (`rvf-*` crates) | Portable binary format for AI knowledge | File on disk | **No** |

### Storage Backends

| Backend | Format | Persistence | Use When |
|---|---|---|---|
| **REDB** | Single `.db` file | Yes — crash-safe, survives restarts | Default for Node.js server apps |
| **In-Memory** (DashMap) | RAM only | No — lost on restart | Testing, WASM, or hot cache layer |
| **RVF** | Binary `.rvf` file | Yes — append-only, cryptographically signed | Distributing AI knowledge, portable containers |
| **IndexedDB** | Browser storage | Yes — per-origin, ~50MB quota | PWA / browser apps via `@ruvector/wasm` |
| **Firestore** | Google Cloud | Yes — managed, scalable | Production cloud deployment via `mcp-brain-server` |

---

## Usage Patterns

### Pattern 1: Node.js API with Persistent Vector Search

The most common pattern. Your API stores and searches vectors locally. No Docker, no PostgreSQL.

```typescript
import { VectorDB } from '@ruvector/node';

// Initialize — creates/opens data/vectors.db
const db = new VectorDB({
  dimensions: 384,
  storagePath: './data/vectors.db',
  distanceMetric: 'cosine',  // or 'euclidean', 'dot'
});

// Store a vector
await db.insert({
  id: 'doc-001',
  vector: new Float32Array([0.1, 0.2, ...]),  // 384 dimensions
  metadata: { title: 'My document', category: 'coaching' },
});

// Search (HNSW approximate nearest neighbor)
const results = await db.search({
  vector: queryVector,
  k: 10,           // top 10 results
  efSearch: 200,   // HNSW beam width (higher = more accurate, slower)
});

// Results: [{ id: 'doc-001', score: 0.95, metadata: {...} }, ...]
```

**That's it.** The `.db` file persists across restarts. HNSW index is maintained automatically.

### Pattern 2: RAG (Retrieval-Augmented Generation)

Store your knowledge base in Ruvector, search before every LLM call.

```typescript
// At startup: load content into Ruvector
for (const doc of myContent) {
  await db.insert({
    id: doc.id,
    vector: embed(doc.text),  // your embedding function
    metadata: { text: doc.text, source: doc.source },
  });
}

// Before every LLM call: search for relevant content
async function getRAGContext(userMessage: string): Promise<string> {
  const queryVec = embed(userMessage);
  const results = await db.search({ vector: queryVec, k: 3 });

  return results
    .filter(r => r.score > 0.5)
    .map(r => r.metadata.text)
    .join('\n\n');
}

// In your LLM call
const ragContext = await getRAGContext(userMessage);
const systemPrompt = `${basePrompt}\n\nRelevant context:\n${ragContext}`;
```

### Pattern 3: User-Scoped Data (Privacy Isolation)

Use separate collections or ID prefixes to isolate user data.

```typescript
// Option A: Prefix-based isolation (single DB, simpler)
await db.insert({
  id: `user:${userId}:conv:${conversationId}`,
  vector: embed(conversationSummary),
  metadata: { userId, summary: conversationSummary },
});

// Search only this user's data
const results = await db.search({ vector: queryVec, k: 5 });
const userResults = results.filter(r => r.id.startsWith(`user:${userId}:`));

// Option B: Separate DB per user (stronger isolation)
const userDb = new VectorDB({
  dimensions: 384,
  storagePath: `./data/users/${userId}.db`,
  distanceMetric: 'cosine',
});
```

### Pattern 4: Browser/PWA with IndexedDB

For offline-capable apps. Ship your knowledge base as a cached asset.

```typescript
import { VectorDB } from '@ruvector/wasm';

const db = await VectorDB.create({
  dimensions: 384,
  indexedDbName: 'my-app-vectors',
});

// Same API as Node.js
await db.insert({ id: 'doc-1', vector: [...], metadata: {...} });
const results = await db.search({ vector: queryVec, k: 5 });
```

### Pattern 5: MCP Brain Server (Full Intelligence Layer)

For projects that need the complete brain — knowledge graph, SONA learning, MCP tools.

```bash
# Build from ruvector repo
cd ruvector/crates/mcp-brain-server
cargo build --release

# Run locally (no external DB needed)
./target/release/mcp-brain-server

# Or with Firestore for persistence
FIRESTORE_URL=https://firestore.googleapis.com/... ./target/release/mcp-brain-server
```

The 22 MCP tools are then available to Claude or any MCP client:
- `brain_search` — semantic search across knowledge
- `brain_share` — store new knowledge
- `brain_vote` — quality scoring (Bayesian)
- `brain_sync` — federated LoRA weight sync
- `brain_transfer` — cross-domain transfer learning
- `brain_page_create/get/delta` — document management
- `brain_status` — system health

---

## Domain-Driven Design Integration

### Bounded Contexts

When integrating Ruvector into a DDD architecture, map it to these contexts:

```
┌─────────────────────────────────────────────┐
│  Knowledge Context (shared, read-mostly)    │
│                                             │
│  Aggregate: ContentLibrary                  │
│  Storage: Single VectorDB collection        │
│  Isolation: None (public content)           │
│  Operations: Insert at startup, search      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  User Context (per-user, private)           │
│                                             │
│  Aggregate: UserMemory                      │
│  Storage: Prefix-scoped or per-user DB      │
│  Isolation: userId prefix on all entries    │
│  Operations: Store conversations, recall    │
│  Invariant: User A NEVER sees User B's data │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Learning Context (system-wide signals)     │
│                                             │
│  Aggregate: LearningProfile                 │
│  Storage: SONA engine (in-memory + export)  │
│  Isolation: Abstract signals only (no PII)  │
│  Operations: Record feedback, adapt weights │
└─────────────────────────────────────────────┘
```

### Entity Mapping

| DDD Entity | Ruvector Storage | ID Pattern |
|---|---|---|
| Content chunk (RAG) | VectorDB entry | `content:{sourceType}:{id}` |
| User conversation | VectorDB entry | `user:{userId}:conv:{convId}` |
| User feedback | VectorDB entry | `user:{userId}:fb:{messageId}` |
| Learning signal | SONA trajectory | Internal (no direct access) |

---

## Deployment Patterns

### Development (Local)

```
Your App → @ruvector/node → data/vectors.db (REDB file)
```

- Zero dependencies beyond npm
- Single file persistence
- Works offline
- Cost: $0

### Production (Cloud Run + Firestore)

```
Your App → mcp-brain-server → Firestore + GCS
                             → SONA (federated learning)
```

- Scale-to-zero on Cloud Run
- Firestore for durable storage
- GCS for large binary assets (RVF containers)
- Cost: ~$100-200/month at moderate traffic

### Edge/PWA (Browser)

```
Your App → @ruvector/wasm → IndexedDB
                          → Cached RVF file (shipped with PWA)
```

- Sub-millisecond search on-device
- Works offline
- Knowledge base cached in Service Worker
- Server only needed for LLM API calls

### Migration Path

```
Development          →  Production           →  Edge
@ruvector/node       →  mcp-brain-server     →  @ruvector/wasm
REDB file            →  Firestore            →  IndexedDB + RVF
Local HNSW           →  Server HNSW          →  Flat index (WASM)
$0                   →  ~$100-200/mo         →  $0 (client-side)
```

The key insight: **your application code doesn't change between stages.** The VectorDB API is the same. Only the storage backend and deployment target change.

---

## Anti-Patterns

### Don't Do This

| Anti-Pattern | Why It's Wrong | Do This Instead |
|---|---|---|
| Install pgvector for vector search | Ruvector has its own HNSW | Use `@ruvector/node` |
| Run PostgreSQL just for vectors | REDB is simpler and faster for this use case | Use REDB (built into `@ruvector/node`) |
| Write a custom cosine similarity function | Ruvector has SIMD-optimized distance functions | Use the built-in search |
| Use the `mcp-brain` npm package for Ruvector projects | It's a different product that wraps pgvector | Use `@ruvector/node` or the Rust `mcp-brain-server` |
| Store vectors in JSON files | No indexing, O(n) search, no persistence guarantees | Use REDB or RVF |
| Use Pinecone/Qdrant/Weaviate alongside Ruvector | Redundant — Ruvector replaces them | Use Ruvector exclusively |
| Skip SONA | The self-learning engine is Ruvector's key differentiator | Enable SONA for production apps |

---

## File Structure Convention

```
your-project/
├── data/
│   ├── vectors.db          # REDB file (Ruvector persistent storage)
│   └── content/            # Raw content for ingestion (optional)
├── src/
│   └── modules/
│       └── learning/
│           ├── ruvector.service.ts    # VectorDB wrapper
│           ├── seeds/                 # Content to ingest at startup
│           └── learning.module.ts     # NestJS/DI module
├── docs/
│   └── ruvector-usage-guide.md        # This file
└── .gitignore                         # Include: data/*.db
```

Add to `.gitignore`:
```
data/*.db
data/*.rvf
```

---

## Reference

### Ruvector Ecosystem Packages

| Package | Type | Published | Key Features |
|---|---|---|---|
| `@ruvector/node` | npm | Yes (v0.1.19) | HNSW + REDB + SIMD, pre-built for macOS/Linux/Windows |
| `@ruvector/wasm` | npm | Yes (v0.1.16) | Browser, in-memory + IndexedDB, flat index |
| `@ruvector/server` | npm | Yes (v0.1.0) | HTTP/gRPC server wrapper |
| `ruvector` | npm | Yes (v0.2.16) | JS wrapper (older, use `@ruvector/node` instead) |
| `ruvector-core` | crate | Yes | The engine: HNSW, REDB, SIMD, quantization |
| `ruvector-sona` | crate | Yes (v0.1.6) | SONA self-learning: LoRA, EWC++, ReasoningBank |
| `ruvllm` | crate | Yes | Embeddings: HashEmbedder, RlmEmbedder |
| `rvf-*` | crates | Yes | RVF format: types, crypto, wire, federation, runtime |
| `mcp-brain-server` | crate | Source | Full brain: 22 MCP tools, SONA, graph, Firestore |
| `ruvector-postgres` | crate | Yes | PostgreSQL extension (optional, for SQL access) |

### Key ADRs (from ruvector/docs/adr/)

- **ADR-001**: Core architecture (HNSW, GNN, multi-platform)
- **ADR-006**: Memory management (tiered hot/warm/cold)
- **ADR-027**: HNSW parameterized queries
- **ADR-029**: RVF canonical format
- **ADR-033**: Progressive indexing
- **ADR-044**: PostgreSQL extension (optional, not required)
- **ADR-059/060**: Shared brain capabilities
- **ADR-064**: Pi-Brain infrastructure
- **ADR-066**: SSE/MCP transport
