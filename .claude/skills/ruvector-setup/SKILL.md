---
name: "Ruvector Setup"
description: "Set up Ruvector for vector storage, HNSW search, RAG, and SONA self-learning in any project. Use when adding vector search, building RAG pipelines, adding AI memory, setting up knowledge bases, or needing persistent embeddings. Replaces pgvector, Pinecone, Qdrant, Weaviate, and Chroma."
---

# Ruvector Setup

## What This Skill Does

Configures Ruvector as the vector storage and AI learning layer for your project. Installs the right package, creates the service wrapper, sets up persistence, and wires RAG retrieval — all without external databases.

**Ruvector is a self-contained AI infrastructure stack.** One npm package replaces PostgreSQL + pgvector + Pinecone + a custom embedding pipeline.

## Prerequisites

- Node.js 18+ (for `@ruvector/node`)
- npm or yarn
- That's it. No PostgreSQL. No Docker. No external services.

---

## Critical Rules (Read Before Implementing)

**DO:**
- Use `@ruvector/node` for Node.js server applications
- Use `@ruvector/wasm` for browser/PWA applications
- Use REDB persistence (built-in, single `.db` file)
- Use Ruvector's native HNSW for vector search
- Store vectors in `data/` directory with `.db` extension

**DO NOT:**
- Install pgvector — Ruvector has its own HNSW
- Install PostgreSQL for vector search — REDB replaces it
- Write custom cosine similarity functions — use built-in search
- Use the `mcp-brain` npm package — that's a different product that wraps pgvector
- Use Pinecone, Qdrant, Weaviate, or Chroma — Ruvector replaces them all
- Write your own in-memory vector store — Ruvector already has one

**The npm `mcp-brain` and the Rust `mcp-brain-server` are DIFFERENT products:**

| | npm `mcp-brain` | Rust `mcp-brain-server` |
|---|---|---|
| Vector engine | pgvector (needs PostgreSQL) | Ruvector native (no DB needed) |
| Storage | PostgreSQL | DashMap + Firestore |
| SONA learning | No | Yes |
| Use for Ruvector projects | **No** | **Yes** |

---

## Quick Start

### 1. Install

```bash
npm install @ruvector/node
```

### 2. Create Vector Service

Create `src/modules/learning/ruvector.service.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// Import will vary based on @ruvector/node API surface
// Adjust types to match the actual package exports
interface VectorEntry {
  id: string;
  vector: Float32Array | number[];
  metadata?: Record<string, unknown>;
}

interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class RuvectorService implements OnModuleInit {
  private readonly logger = new Logger(RuvectorService.name);
  private db: any; // VectorDB instance from @ruvector/node

  async onModuleInit() {
    const { VectorDB } = await import('@ruvector/node');
    this.db = new VectorDB({
      dimensions: 384,
      storagePath: './data/vectors.db',
      distanceMetric: 'cosine',
    });
    this.logger.log('Ruvector initialized with REDB persistence');
  }

  async store(entry: VectorEntry): Promise<string> {
    return this.db.insert(entry);
  }

  async storeBatch(entries: VectorEntry[]): Promise<string[]> {
    return this.db.insertBatch(entries);
  }

  async search(vector: number[] | Float32Array, k = 10): Promise<SearchResult[]> {
    return this.db.search({ vector, k, efSearch: 200 });
  }

  async delete(id: string): Promise<boolean> {
    return this.db.delete(id);
  }

  async count(): Promise<number> {
    return this.db.len();
  }
}
```

### 3. Add to Module

```typescript
import { Module, Global } from '@nestjs/common';
import { RuvectorService } from './ruvector.service';

@Global()
@Module({
  providers: [RuvectorService],
  exports: [RuvectorService],
})
export class LearningModule {}
```

### 4. Update .gitignore

```
data/*.db
data/*.rvf
```

### 5. Use It

```typescript
// Store content
await ruvectorService.store({
  id: 'doc-001',
  vector: new Float32Array(embeddings),
  metadata: { text: 'My content', source: 'podcast' },
});

// Search
const results = await ruvectorService.search(queryVector, 5);
```

---

## RAG Pattern (Retrieval-Augmented Generation)

The most common use case. Store your knowledge base, search before every LLM call.

### Ingestion (at startup or via pipeline)

```typescript
async seedContent(items: Array<{ id: string; text: string; embedding: number[] }>) {
  for (const item of items) {
    await this.ruvector.store({
      id: item.id,
      vector: new Float32Array(item.embedding),
      metadata: { text: item.text },
    });
  }
  this.logger.log(`Seeded ${items.length} content entries`);
}
```

### Retrieval (before every LLM response)

```typescript
async getRAGContext(userMessage: string, embedding: number[]): Promise<string> {
  const results = await this.ruvector.search(embedding, 3);
  return results
    .filter(r => r.score > 0.5)
    .map(r => r.metadata?.text as string)
    .join('\n\n');
}

// In your LLM call
const ragContext = await getRAGContext(userMessage, embed(userMessage));
const systemPrompt = `${basePrompt}\n\nRelevant context:\n${ragContext}`;
```

---

## User Isolation Pattern

Ensure one user can never access another user's data.

### Option A: ID Prefix (Simple, Single DB)

```typescript
// Store with user prefix
await ruvector.store({
  id: `user:${userId}:conv:${conversationId}`,
  vector: embedding,
  metadata: { userId, text: summary },
});

// Search with post-filter
const results = await ruvector.search(queryVec, 10);
const userResults = results.filter(r => r.id.startsWith(`user:${userId}:`));
```

### Option B: Separate DB Per User (Strongest Isolation)

```typescript
// Each user gets their own .db file
const userDb = new VectorDB({
  dimensions: 384,
  storagePath: `./data/users/${userId}.db`,
  distanceMetric: 'cosine',
});
```

---

## Deployment Progression

### Local Development

```
App → @ruvector/node → data/vectors.db
```
- Zero dependencies. Single file. $0 cost.

### Production (Cloud Run + Firestore)

```
App → Rust mcp-brain-server → Firestore + GCS
```
- Build from `ruvector/crates/mcp-brain-server`
- Set `FIRESTORE_URL` for persistence
- Scale-to-zero on Cloud Run

### Edge/PWA (Browser)

```
App → @ruvector/wasm → IndexedDB
```
- Ship knowledge as cached RVF file
- Sub-millisecond on-device search
- Server only needed for LLM API calls

**Same application code at every stage.** Only the storage backend changes.

---

## File Structure

```
your-project/
├── data/
│   └── vectors.db              # REDB persistence (gitignored)
├── src/
│   └── modules/
│       └── learning/
│           ├── ruvector.service.ts  # VectorDB wrapper
│           ├── learning.module.ts   # NestJS module
│           └── seeds/               # Content to ingest
│               └── content.ts
├── docs/
│   └── ruvector-usage-guide.md  # Copy from template
└── .gitignore                   # data/*.db, data/*.rvf
```

---

## Troubleshooting

### Issue: `@ruvector/node` native binary fails to install

**Symptoms**: `npm install` error about native compilation
**Cause**: Pre-built binary not available for your platform
**Solution**:
```bash
# Check platform support
node -e "console.log(process.platform, process.arch)"
# Supported: darwin-arm64, darwin-x64, linux-x64-gnu, linux-arm64-gnu, win32-x64-msvc

# If your platform isn't supported, use WASM fallback
npm install @ruvector/wasm
```

### Issue: REDB file locked

**Symptoms**: "database is locked" error
**Cause**: Two processes accessing the same `.db` file
**Solution**: Ensure only one API process runs at a time, or use separate files per service.

### Issue: Search returns no results

**Symptoms**: `search()` returns empty array
**Cause**: Data not ingested, or embedding dimensions mismatch
**Solution**:
```typescript
// Verify count
const count = await ruvector.count();
console.log(`${count} entries in store`);

// Verify dimensions match
// Your embeddings MUST be the same dimension as the DB (e.g., 384)
```

---

## Reference

### Ruvector Packages

| Package | Use For | Storage | Search |
|---|---|---|---|
| `@ruvector/node` | Node.js servers | REDB (file) | HNSW + SIMD |
| `@ruvector/wasm` | Browsers/PWA | IndexedDB | Flat index |
| `ruvector-core` (Rust) | Rust applications | REDB or memory | HNSW + SIMD |
| `ruvector-sona` (Rust) | Self-learning | In-memory | LoRA + EWC++ |
| `mcp-brain-server` (Rust) | Full brain + MCP | DashMap + Firestore | Cosine + SONA |

### Storage Backends

| Backend | Persistence | Best For |
|---|---|---|
| REDB | Yes (single `.db` file) | Default for Node.js |
| In-Memory (DashMap) | No | Testing, WASM |
| RVF | Yes (`.rvf` file) | Distributing knowledge |
| IndexedDB | Yes (browser) | PWA offline |
| Firestore | Yes (cloud) | Production cloud |
