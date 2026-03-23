# ADR-004: Primary Database Selection

**Status:** Proposed
**Date:** 2026-03-22

**Context:**

The Coach Keith AI platform requires persistent storage for multiple data domains:

1. **User data** — Profiles, authentication records, subscription status, preferences, onboarding state.
2. **Conversation data** — Chat messages, conversation threads, AI response metadata (model used, token counts, latency), user feedback/ratings on responses.
3. **Assessment data** — Structured assessment results (marriage assessment, business assessment, personal growth tracker), historical scores, progress metrics.
4. **Content metadata** — Podcast episodes, Instagram posts, book chapters, content chunks with source attribution and timestamps.
5. **Vector embeddings** — 3072-dimensional vectors for ~20,000 content chunks used in RAG retrieval (see ADR-006).

We evaluated:

1. **PostgreSQL (RDS)** with **pgvector** extension — Relational + vector in a single database.
2. **PostgreSQL (RDS)** + **Pinecone** — Relational database + dedicated vector store.
3. **MongoDB Atlas** — Document store with Atlas Vector Search.
4. **PlanetScale (MySQL)** — Serverless MySQL with branching workflows.

The critical question is whether to use a single database for both relational and vector workloads, or separate them into specialized systems.

**Decision:**

We will use **PostgreSQL 16** on **Amazon RDS** with the **pgvector v0.7+** extension enabled as our single primary database. The database will be accessed via **Prisma ORM v6** with raw SQL queries for vector operations (Prisma does not yet natively support pgvector operators).

Key configuration:

- **Instance**: `db.t4g.medium` (2 vCPU, 4 GB RAM) — sufficient for Year 1 scale
- **Storage**: 50 GB gp3 SSD with auto-scaling up to 200 GB
- **Multi-AZ**: Enabled in production for high availability
- **Automated backups**: 7-day retention with point-in-time recovery
- **pgvector index**: HNSW index on the embeddings column for approximate nearest neighbor search
- **Connection pooling**: PgBouncer via RDS Proxy to manage connection limits from ECS tasks and Lambda functions

Schema highlights:

```sql
-- Vector storage co-located with content metadata
CREATE TABLE content_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(20) NOT NULL, -- 'podcast', 'instagram', 'book'
  source_id UUID REFERENCES content_sources(id),
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(3072), -- OpenAI text-embedding-3-large
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_embedding ON content_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Consequences:**

### Pros (+)
- **Single database for relational + vector queries**: No need to synchronize data between a relational DB and a separate vector store. Content metadata and embeddings live in the same row, enabling joins between vector search results and content metadata in a single query.
- **ACID compliance**: Full transactional guarantees for user data, subscription state, and financial records. Critical for maintaining data integrity when updating user profiles, recording payments, and tracking conversation state.
- **Proven at scale**: PostgreSQL handles millions of rows comfortably. Our projected data volume (50K users, 500K conversations, 20K content chunks) is well within PostgreSQL's comfort zone.
- **pgvector HNSW performance**: For 20,000 vectors at 3072 dimensions, pgvector's HNSW index provides sub-10ms approximate nearest neighbor search with 95%+ recall — more than sufficient for our RAG pipeline.
- **Prisma ORM integration**: Type-safe database access with auto-generated TypeScript types from the schema, migrations management, and seeding support. Raw SQL escape hatch available for vector queries.
- **Cost-effective**: A single `db.t4g.medium` RDS instance (~$55/month) handles all workloads. No additional vector database subscription cost.

### Cons (-)
- **pgvector less optimized than purpose-built vector DBs**: At scales beyond 1M+ vectors, Pinecone and Weaviate offer better query performance, hybrid search capabilities, and managed scaling. pgvector's HNSW index rebuild time grows linearly with dataset size.
- **Vector operations bypass Prisma**: pgvector queries require raw SQL via `prisma.$queryRaw`, losing some type safety and requiring manual result mapping. This creates a maintenance burden and a potential source of SQL injection if not handled carefully.
- **Single point of failure risk**: Concentrating all data in one database means a PostgreSQL outage affects every feature. Multi-AZ mitigates this, but RDS failover still incurs 60-120 seconds of downtime.
- **Scaling constraints**: Vertical scaling (upgrading instance size) has limits. Horizontal read scaling requires RDS read replicas, which add complexity and cost.

### Tradeoffs
We are choosing **operational simplicity and cost efficiency** over specialized vector query performance. At 20,000 vectors, pgvector is operating well within its performance sweet spot — purpose-built vector databases like Pinecone only show meaningful advantages at 100K+ vectors with complex hybrid search requirements. The migration path to Pinecone is well-defined (see ADR-006): export embeddings, create a Pinecone index, update the retrieval service to query Pinecone instead of pgvector. This migration can be executed in 1-2 sprints if needed, making this decision low-risk and easily reversible.
