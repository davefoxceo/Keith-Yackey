# ADR-012: Content Ingestion Pipeline Architecture

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
Coach Keith's AI must be grounded in his actual teachings and content. The content corpus includes multiple source types: two podcast RSS feeds (The Keith Yackey Show and Marriage & Martinis or equivalent, totaling approximately 88 episodes), an ebook on marriage frameworks, Instagram posts and reels, and transcripts from live coaching sessions. Each source type has different formats (audio, text, social media), update frequencies (podcasts publish weekly, Instagram posts are irregular), and processing requirements (audio needs transcription, text needs chunking, all need embedding). The ingestion pipeline must handle both the initial bulk load of existing content and ongoing ingestion of new episodes and posts as they are published.

**Decision:**
Build a two-part ingestion system: a CLI tool for bulk operations and an automated Lambda for ongoing monitoring.

**Bulk Ingestion CLI (Node.js/TypeScript):**
- Command: `npx coach-keith-ingest --source podcast --feed-url <url>`
- Pipeline stages executed sequentially per content item:
  1. **Catalog:** Parse RSS feed XML, extract episode metadata (title, date, description, audio URL, duration). Store in `content_catalog` table with status tracking.
  2. **Download:** Fetch audio files to temporary S3 staging bucket (`s3://coach-keith-content-staging/`). Supports resume on failure.
  3. **Transcribe:** Submit to Amazon Transcribe (or Whisper API as fallback). Output: timestamped transcript JSON. Speaker diarization enabled for interview episodes.
  4. **Process:** Chunk transcripts using semantic chunking (split on topic boundaries, not fixed token counts). Target chunk size: 500-800 tokens with 100-token overlap. Extract metadata: topics, frameworks mentioned, Bible verses referenced, key quotes.
  5. **Embed:** Generate embeddings via `text-embedding-3-small` (OpenAI) or Anthropic's embedding model. Store vectors in Pinecone index `coach-keith-content` with metadata filters for source type, episode number, date, and topic tags.

**Ongoing RSS Monitor (AWS Lambda):**
- Triggered by EventBridge cron rule every 6 hours
- Checks RSS feeds for new episodes not present in `content_catalog`
- For new episodes, writes a message to an SQS queue that triggers the same pipeline stages
- Lightweight: Lambda only handles detection and queuing; processing happens in a separate Lambda or ECS task to avoid 15-minute timeout limits

**Ebook Ingestion:**
- One-time CLI command: `npx coach-keith-ingest --source ebook --file <path>`
- PDF/EPUB parsed with `pdf-parse` or `epub2` library
- Chunked by chapter and section with heading hierarchy preserved in metadata

**Instagram Ingestion (V2):**
- Deferred to post-MVP. Manual curation of key posts as text content for V1.
- V2 plan: Instagram Graph API integration with image caption extraction

**Decision Records:**
- All ingested content tracked in PostgreSQL `content_catalog` table with columns: `id`, `source_type`, `source_id`, `title`, `published_at`, `status` (cataloged/downloaded/transcribed/processed/embedded), `metadata` (JSONB), `chunk_count`, `created_at`, `updated_at`

**Consequences:**

### Pros (+)
- CLI tool enables rapid iteration and debugging during development
- Pipeline stages are independently rerunnable — can re-process from any stage on failure
- Cron-based monitoring is simple, cheap, and sufficient for weekly podcast cadence
- SQS decoupling prevents Lambda timeout issues for long-running transcription jobs
- Content catalog provides full visibility into ingestion state

### Cons (-)
- CLI approach requires manual execution for bulk loads (acceptable for one-time operation)
- 6-hour polling interval means new episodes may take up to 6 hours to appear
- No real-time event streaming — not suitable if content freshness becomes critical
- Transcription costs can be significant for 88 episodes (~$50-100 for initial bulk load)

### Tradeoffs
The primary tradeoff is **simplicity for V1 over event-driven scalability**. A fully event-driven architecture (S3 event notifications, Step Functions orchestration, EventBridge pipes) would be more robust but significantly more complex to build and debug. The CLI + cron approach can process the entire content corpus in a single afternoon and handles ongoing ingestion adequately for weekly publishing cadences. Migration to Step Functions can happen in V2 if content volume or source diversity increases substantially.
