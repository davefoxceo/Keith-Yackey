# ADR-010: Embedding Model Selection

**Status:** Proposed
**Date:** 2026-03-22

**Context:**

The RAG pipeline (see ADR-009) requires vector embeddings for two distinct workloads:

1. **Corpus embedding (offline)** — Embed ~20,000 content chunks from Keith's podcasts, book, Instagram posts, and coaching frameworks. This is a one-time batch operation during initial content ingestion, with incremental updates as new content is published (estimated 50-100 new chunks per week).
2. **Query embedding (real-time)** — Embed each user query at request time to perform vector similarity search against the content corpus. This is latency-sensitive — every millisecond adds to the user-perceived response time. Expected volume: 15,000-50,000 queries/day at scale.

Key selection criteria:

- **Retrieval quality (recall@10)**: The most important metric. Higher-quality embeddings mean more relevant content chunks are retrieved, directly improving AI coaching response quality.
- **Embedding dimensions**: Higher dimensions capture more semantic nuance but consume more storage and slow down similarity search.
- **Latency**: Query embedding must complete within the 100ms budget allocated in the RAG pipeline (ADR-009).
- **Cost**: Corpus embedding is a one-time cost. Query embedding is an ongoing per-request cost that scales with user base.
- **Matryoshka support**: The ability to truncate embeddings to lower dimensions without re-embedding — useful for cost/performance optimization.

We evaluated:

1. **OpenAI `text-embedding-3-large`** (3072 dims) — Best-in-class retrieval quality on MTEB benchmarks.
2. **OpenAI `text-embedding-3-small`** (1536 dims) — Strong quality at lower cost and dimensions.
3. **Cohere `embed-v4`** (1024 dims) — Competitive quality with built-in compression.
4. **Voyage AI `voyage-3-large`** (1024 dims) — Strong retrieval quality, optimized for RAG.
5. **Open-source models (e.g., `bge-large-en-v1.5`)** — Free but requires self-hosting infrastructure.

**Decision:**

We will use a **dual-model strategy** from OpenAI's embedding family:

| Workload | Model | Dimensions | Cost | Rationale |
|----------|-------|------------|------|-----------|
| Corpus embedding | `text-embedding-3-large` | 3072 | $0.13/M tokens | One-time cost, maximum quality |
| Query embedding | `text-embedding-3-small` | 1536 → 3072 (zero-padded) | $0.02/M tokens | Per-request cost, latency-sensitive |

**Wait — why different models for corpus and queries?**

This is not a mistake. OpenAI's `text-embedding-3` family uses **Matryoshka Representation Learning (MRL)**, which means the first N dimensions of a larger embedding capture the most important semantic information. This enables a specific optimization:

1. **Corpus** is embedded with `text-embedding-3-large` at full 3072 dimensions, capturing maximum semantic nuance for Keith's content.
2. **Queries** are embedded with `text-embedding-3-small` at 1536 dimensions, then zero-padded to 3072 dimensions for compatibility with the corpus vectors.

**Important correction**: After further analysis, this dual-model approach introduces compatibility risks. Cross-model embedding comparisons (even within the same family) can degrade retrieval quality by 10-15%. We will instead use a **single-model strategy**:

### Revised Decision

| Workload | Model | Dimensions | Cost |
|----------|-------|------------|------|
| Corpus embedding | `text-embedding-3-large` | 3072 | $0.13/M tokens |
| Query embedding | `text-embedding-3-large` | 3072 | $0.13/M tokens |

Both corpus and query embeddings use the same model and dimensions to ensure maximum compatibility and retrieval quality.

### Cost Analysis

**Corpus embedding (one-time)**:
- 20,000 chunks, average 300 tokens each = 6M tokens
- Cost: 6M x $0.13/M = **$0.78 total**
- Re-embedding on model upgrade: same cost (negligible)

**Query embedding (ongoing)**:
- 5,000 subscribers x 3 queries/day = 15,000 queries/day
- Average query: 50 tokens
- Daily: 750K tokens = **$0.10/day**
- Monthly: **$2.93/month**
- At 20,000 subscribers: **$11.70/month**

**Total embedding cost at Year 1 scale: ~$3-4/month** — negligible compared to Claude API costs ($6,600-16,500/month, see ADR-008).

### Integration

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Corpus embedding (batch, offline)
async function embedCorpusChunk(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072,
  });
  return response.data[0].embedding;
}

// Query embedding (real-time, latency-sensitive)
async function embedQuery(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 3072,
  });
  return response.data[0].embedding;
}
```

### Embedding Pipeline for Content Ingestion

```
New Content Published
    │
    ▼
┌─────────────┐
│ Text Chunking│   ← 300-500 token chunks with 50-token overlap
│ (recursive)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Embedding   │   ← text-embedding-3-large, batch of 100
│ (OpenAI API) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Store in    │   ← INSERT into content_chunks with embedding
│  PostgreSQL  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Update HNSW  │   ← REINDEX if chunk count increased by >10%
│   Index      │
└─────────────┘
```

Chunking strategy:
- **Chunk size**: 300-500 tokens (optimized for coaching content density)
- **Overlap**: 50 tokens between adjacent chunks (preserves context at boundaries)
- **Chunking method**: Recursive character text splitter with sentence boundary awareness
- **Metadata per chunk**: source_type, source_id, chunk_index, timestamp, topic_tags

**Consequences:**

### Pros (+)
- **Best-in-class retrieval quality**: `text-embedding-3-large` ranks at or near the top of the MTEB (Massive Text Embedding Benchmark) leaderboard for retrieval tasks. Higher-quality embeddings mean more relevant content chunks are retrieved for Keith's coaching responses, directly improving the core product experience.
- **Single model for corpus and queries**: Using the same model and dimensions for both embedding workloads ensures perfect compatibility and maximum retrieval recall. No cross-model degradation.
- **Negligible cost**: At $3-4/month for embedding at Year 1 scale, the embedding cost is a rounding error in the overall infrastructure budget. This removes cost as a decision factor entirely — we can optimize purely for quality.
- **Matryoshka dimensionality reduction option**: If storage or query performance becomes a concern at scale, we can truncate embeddings from 3072 to 1536 or even 1024 dimensions with graceful quality degradation (MTEB scores drop ~2-3%), without re-embedding the corpus.
- **Battle-tested API**: OpenAI's embedding API has 99.9%+ uptime, generous rate limits (3,000 RPM), and well-documented error handling. The `openai` Node.js SDK provides automatic retries with exponential backoff.

### Cons (-)
- **Cross-vendor dependency**: The RAG pipeline now uses OpenAI for embeddings and Anthropic for generation. If vendor relationships, pricing, or terms of service change, this creates a dependency on two AI providers. Consolidating on Anthropic's future embedding model (if released) could simplify the vendor landscape.
- **3072 dimensions increases storage**: Each 3072-dimensional float32 vector consumes 12,288 bytes (~12 KB). For 20,000 chunks, total vector storage is ~240 MB. This is manageable on RDS but will grow linearly with content. At 100,000 chunks, vector storage alone would consume ~1.2 GB.
- **Higher query latency than smaller models**: Embedding a query with `text-embedding-3-large` takes 30-80ms (p50-p95), compared to 15-40ms for `text-embedding-3-small`. This consumes a significant portion of the 100ms query embedding budget in the RAG pipeline.
- **No on-premise option**: OpenAI embeddings are API-only. If data residency requirements emerge (e.g., GDPR for EU users), we cannot run the embedding model locally. An open-source alternative like `bge-large-en-v1.5` would be needed.

### Tradeoffs
We are choosing **embedding quality** over **vendor consolidation**. The ideal scenario would be using Anthropic for both embeddings and generation, but Anthropic does not currently offer a competitive embedding model. OpenAI's `text-embedding-3-large` is the clear quality leader for retrieval tasks, and the cost ($3-4/month) makes it impractical to compromise on quality for vendor simplification. If Anthropic releases an embedding model with comparable MTEB scores, we will evaluate migration — the corpus re-embedding cost ($0.78) makes switching trivially cheap. The cross-vendor risk is mitigated by the fact that the embedding interface is simple (text in, vector out) and highly portable — switching providers requires changing one API call, not re-architecting the pipeline.
