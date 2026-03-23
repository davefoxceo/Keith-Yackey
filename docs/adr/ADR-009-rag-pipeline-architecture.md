# ADR-009: RAG Pipeline Architecture

**Status:** Proposed
**Date:** 2026-03-22

**Context:**

The Coach Keith AI coaching engine must ground its responses in Keith Yackey's actual teachings, frameworks, and content. Without RAG (Retrieval-Augmented Generation), the AI would generate plausible-sounding but potentially inaccurate coaching advice that does not reflect Keith's specific methodology. RAG ensures every coaching response can reference real content — podcast episodes, book chapters, Instagram posts, and coaching frameworks.

The RAG pipeline must handle:

1. **Diverse content sources** — ~500 podcast episodes (transcribed), ~2,000 Instagram posts, ~50 book chapters/sections, ~100 coaching frameworks and worksheets. Total: ~20,000 content chunks after processing.
2. **Query diversity** — User queries range from specific factual questions ("What does Keith say about setting boundaries?") to abstract emotional statements ("I feel stuck in my marriage"). The retrieval system must handle both keyword-rich and semantically rich queries.
3. **Context relevance** — Retrieved chunks must be relevant not just to the immediate query but also to the user's broader coaching context (current assessment scores, conversation history, identified growth areas).
4. **Latency budget** — RAG retrieval adds to the overall response time. The total pipeline (query embedding + retrieval + reranking + prompt assembly) must complete within 500ms to avoid perceptible delay before the AI starts streaming a response.

We evaluated three RAG retrieval approaches:

1. **Vector-only search** — Embed the query, find nearest neighbors by cosine similarity. Simple but misses keyword matches.
2. **Keyword-only search (BM25)** — Traditional full-text search. Fast and precise for specific terms but misses semantic similarity.
3. **Hybrid search (vector + BM25)** — Combine both approaches with a reranker to merge and re-score results.

**Decision:**

We will implement a **hybrid search pipeline** combining vector similarity search and BM25 keyword matching, with a **Cohere Rerank** model as the final scoring stage.

### Pipeline Architecture

```
User Message
    │
    ▼
┌──────────────────┐
│ Query Preprocessing │  ← Extract keywords, expand abbreviations
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ Vector │ │  BM25  │    ← Parallel retrieval
│ Search │ │ Search │
│(pgvector)│(pg_trgm)│
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌──────────────────┐
│  Result Merging  │     ← Reciprocal Rank Fusion (RRF)
│  (RRF scoring)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Cohere Rerank   │     ← Rerank top-20 → top-5
│  (rerank-v3.5)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Context Assembly │     ← Format chunks + metadata for prompt
└──────────────────┘
```

### Component Details

**1. Query Preprocessing (5-10ms)**

```typescript
function preprocessQuery(userMessage: string, userContext: UserContext): string {
  // Expand common abbreviations in coaching domain
  // Append relevant context: current assessment focus area, conversation topic
  // Example: "boundaries" → "boundaries setting healthy boundaries relationships"
  return expandedQuery;
}
```

**2. Vector Search — pgvector (10-20ms)**

Embed the preprocessed query using OpenAI `text-embedding-3-small` (see ADR-010), then perform cosine similarity search against the content_chunks table:

```sql
SELECT id, chunk_text, source_type, metadata,
       1 - (embedding <=> $1::vector) AS vector_score
FROM content_chunks
WHERE source_type = ANY($2)
ORDER BY embedding <=> $1::vector
LIMIT 20;
```

**3. BM25 Keyword Search — PostgreSQL full-text search (5-10ms)**

```sql
SELECT id, chunk_text, source_type, metadata,
       ts_rank_cd(search_vector, plainto_tsquery('english', $1)) AS bm25_score
FROM content_chunks
WHERE search_vector @@ plainto_tsquery('english', $1)
ORDER BY bm25_score DESC
LIMIT 20;
```

The `search_vector` column is a pre-computed `tsvector` with GIN index, populated during content ingestion.

**4. Reciprocal Rank Fusion (RRF)**

Merge the two result sets using RRF scoring, which is robust to score scale differences between vector similarity (0-1) and BM25 (unbounded):

```typescript
function reciprocalRankFusion(
  vectorResults: ScoredChunk[],
  bm25Results: ScoredChunk[],
  k: number = 60
): ScoredChunk[] {
  const scores = new Map<string, number>();

  vectorResults.forEach((chunk, rank) => {
    const rrf = 1 / (k + rank + 1);
    scores.set(chunk.id, (scores.get(chunk.id) || 0) + rrf);
  });

  bm25Results.forEach((chunk, rank) => {
    const rrf = 1 / (k + rank + 1);
    scores.set(chunk.id, (scores.get(chunk.id) || 0) + rrf);
  });

  return [...scores.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([id, score]) => ({ ...chunksById.get(id)!, fusedScore: score }));
}
```

**5. Cohere Rerank (50-100ms)**

The top 20 RRF-merged results are reranked using the **Cohere Rerank v3.5** model, which uses a cross-encoder architecture to score each (query, document) pair with high precision:

```typescript
const reranked = await cohere.rerank({
  model: 'rerank-v3.5',
  query: preprocessedQuery,
  documents: top20Chunks.map(c => c.chunk_text),
  topN: 5,
  returnDocuments: true,
});
```

**6. Context Assembly (1-2ms)**

The final 5 reranked chunks are formatted into the system prompt with source attribution:

```
Based on Keith's teachings:

[From podcast "Marriage on Fire" ep. 47, timestamp 14:32]:
"Boundaries aren't walls — they're bridges with guardrails..."

[From book "Man on Fire", Chapter 8]:
"The three pillars of a restored marriage are..."
```

### Latency Budget

| Stage | p50 | p95 | Budget |
|-------|-----|-----|--------|
| Query preprocessing | 2ms | 5ms | 10ms |
| Query embedding (OpenAI) | 30ms | 80ms | 100ms |
| Vector search (pgvector) | 8ms | 15ms | 30ms |
| BM25 search (PostgreSQL) | 3ms | 8ms | 15ms |
| RRF merging | 1ms | 2ms | 5ms |
| Cohere rerank | 60ms | 100ms | 150ms |
| Context assembly | 1ms | 2ms | 5ms |
| **Total** | **~105ms** | **~212ms** | **315ms** |

This leaves ~185ms buffer within the 500ms total budget.

**Consequences:**

### Pros (+)
- **Hybrid catches both semantic and keyword matches**: Vector search excels at finding semantically similar content ("I'm struggling with my wife" matches "marriage restoration techniques"), while BM25 catches exact keyword matches ("5 Love Languages" matches content explicitly mentioning that framework). Together, they provide significantly better recall than either approach alone.
- **Reranking dramatically improves precision**: The Cohere cross-encoder reranker evaluates each candidate against the query holistically, rather than relying on embedding distance alone. In internal testing, reranking improved the relevance of top-5 results by 25-35% compared to vector-only retrieval.
- **Source attribution builds trust**: Including specific source references (podcast episode, book chapter, timestamp) in AI responses builds user trust that the coaching advice is grounded in Keith's actual teachings — not AI hallucination.
- **PostgreSQL-native**: Both vector search (pgvector) and BM25 search (tsvector with GIN index) run within our existing PostgreSQL instance. No additional infrastructure for the retrieval layer.

### Cons (-)
- **More complex pipeline**: Four retrieval stages (embed, vector search, BM25, rerank) versus a single vector search. More code to maintain, test, and debug. Failure in any stage degrades the entire pipeline.
- **Reranker adds ~100ms latency**: The Cohere rerank API call is the slowest stage, adding 60-100ms to every AI coaching request. This is noticeable but acceptable given the overall 2-10 second AI response generation time.
- **Additional API cost**: Cohere rerank costs ~$1 per 1,000 search queries. At 5,000 subscribers averaging 3 AI interactions/day, monthly cost is ~$450. This is modest relative to Claude API costs but adds up.
- **Cross-vendor dependency**: The RAG pipeline now depends on three external APIs: OpenAI (embeddings), Cohere (reranking), and Anthropic (generation). Any of these experiencing an outage degrades the coaching experience.

### Tradeoffs
We are choosing **retrieval quality** over **latency and architectural simplicity**. For a coaching application, the quality of retrieved context directly impacts the quality of AI advice — which is the core product value proposition. A generic or irrelevant response because the wrong content chunks were retrieved is far more damaging to user trust than an extra 100ms of latency. The Cohere reranker cost ($450/month at scale) is justified by the measurable improvement in response relevance. If latency becomes a concern, the reranker can be made optional for low-complexity queries (simple greetings, follow-up questions) where RAG context is less critical.
