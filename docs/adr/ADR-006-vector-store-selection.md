# ADR-006: Vector Store Selection

**Status:** Proposed
**Date:** 2026-03-22

**Context:**

The Coach Keith AI coaching engine uses Retrieval-Augmented Generation (RAG) to ground AI responses in Keith Yackey's actual content — podcast episodes, Instagram posts, book chapters, and coaching frameworks. This requires storing vector embeddings of ~20,000 content chunks and performing semantic similarity searches at query time to retrieve the most relevant chunks for inclusion in the AI coaching prompt.

The vector store must support:

1. **Semantic search** — Find content chunks most similar to a user's query or coaching context.
2. **Metadata filtering** — Filter by content source (podcast, book, Instagram), topic tags, date range, and relevance score thresholds.
3. **Reasonable query latency** — RAG retrieval adds to the overall response time; target is under 100ms for top-10 retrieval.
4. **Embedding dimensions** — 3072-dimensional vectors from OpenAI `text-embedding-3-large` (see ADR-010).

We evaluated:

1. **pgvector** — PostgreSQL extension for vector similarity search, co-located with our primary database (see ADR-004).
2. **Pinecone** — Purpose-built managed vector database with hybrid search (vector + keyword).
3. **Weaviate** — Open-source vector database with built-in vectorization modules.
4. **Chroma** — Lightweight open-source vector database designed for AI applications.
5. **Qdrant** — High-performance open-source vector database with rich filtering.

**Decision:**

We will use **pgvector v0.7+** co-located with our **PostgreSQL 16 (RDS)** instance as the vector store for V1, with a documented migration path to **Pinecone** if vector search requirements exceed pgvector's capabilities.

Vector search configuration:

- **Index type**: HNSW (Hierarchical Navigable Small World) — provides the best recall/speed tradeoff for our dataset size
- **Distance metric**: Cosine similarity (`vector_cosine_ops`)
- **HNSW parameters**: `m = 16` (connections per node), `ef_construction = 64` (build-time search breadth)
- **Query-time parameter**: `SET hnsw.ef_search = 40` for top-10 retrieval with >95% recall

Retrieval query pattern:

```sql
SELECT id, chunk_text, source_type, metadata,
       1 - (embedding <=> $1::vector) AS similarity
FROM content_chunks
WHERE source_type = ANY($2)  -- metadata filter
  AND 1 - (embedding <=> $1::vector) > 0.7  -- similarity threshold
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

**Migration trigger criteria** (any one of these would trigger migration to Pinecone):

- Vector count exceeds 100,000 chunks
- p95 vector query latency exceeds 50ms
- Need for advanced hybrid search (dense + sparse vectors) that pgvector cannot support
- Need for real-time index updates at >100 writes/second

**Migration path to Pinecone**:

1. Export all embeddings and metadata from PostgreSQL using a batch script.
2. Create a Pinecone index (`coach-keith-content`, `p2` pod type, cosine metric, 3072 dimensions).
3. Upsert all vectors with metadata to Pinecone.
4. Update the `RetrievalService` to query Pinecone instead of pgvector (interface remains the same via dependency injection).
5. Keep pgvector data as a backup for 30 days, then drop the embedding column.

**Consequences:**

### Pros (+)
- **No additional infrastructure**: The embeddings live in the same PostgreSQL instance as all other application data, eliminating the need to provision, secure, monitor, and pay for a separate vector database service.
- **Co-located with metadata**: Content chunks, their embeddings, and their metadata (source type, timestamps, tags) are in the same table. This enables single-query retrieval with metadata filtering — no need to perform a vector search in one system and then look up metadata in another.
- **Sufficient performance for our scale**: Benchmarks show pgvector with HNSW handles 20,000 vectors at 3072 dimensions with p95 query latency under 15ms and recall above 95%. This is well within our 100ms latency budget for RAG retrieval.
- **Zero additional cost**: No Pinecone subscription ($70+/month for the Starter plan with sufficient capacity) or other vector DB hosting fees.
- **Transactional consistency**: Embedding inserts and content metadata updates happen in the same database transaction. If content ingestion fails midway, both the metadata and embedding are rolled back together — impossible with a separate vector store.

### Cons (-)
- **Less optimized than purpose-built vector DBs**: Pinecone and Qdrant offer advanced features like hybrid search (combining dense vector similarity with BM25 sparse vectors in a single query), managed auto-scaling, and optimized distance calculations using SIMD instructions. pgvector's query planner may not always choose the HNSW index efficiently when combined with complex WHERE clauses.
- **No managed scaling**: As vector count grows, pgvector's HNSW index consumes increasing amounts of RAM. At 100K+ vectors with 3072 dimensions, the index may not fit in the RDS instance's available memory, degrading to slower disk-based lookups.
- **Index rebuild overhead**: Adding new vectors to an HNSW index is efficient (O(log n) per insert), but a full index rebuild (e.g., after changing HNSW parameters) can take several minutes at 20K+ vectors and locks the table.
- **Limited observability**: pgvector provides no built-in dashboards for query latency, recall metrics, or index health. Monitoring must be built manually using `pg_stat_statements` and custom CloudWatch metrics.

### Tradeoffs
We are choosing **cost and operational simplicity** over specialized vector search performance. For a corpus of ~20,000 chunks, pgvector is operating in its optimal range — the performance advantages of Pinecone or Qdrant only become meaningful at 100K+ vectors with complex hybrid search requirements. The documented migration path to Pinecone ensures this decision is easily reversible in 1-2 sprint cycles. The $70+/month Pinecone cost savings over the first year ($840+) is better allocated to Claude API credits, which are the dominant cost driver for this application.
