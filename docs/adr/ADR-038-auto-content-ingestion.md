# ADR-038: Automated Content Ingestion Pipeline

**Status:** Proposed
**Date:** 2026-03-24
**Related:** ADR-009 (RAG Pipeline), ADR-010 (Embeddings), ADR-032 (Pi-Brain Persistence), ADR-035 (Admin Dashboard)

---

## Context

Coach Keith AI's knowledge base is currently a static set of 158 manually curated entries seeded at build time. Keith produces new content constantly -- weekly podcast episodes (Married Game Podcast), YouTube videos on the @marriedgame channel, Instagram content, and written material. None of this new content reaches the AI brain automatically, meaning the AI's knowledge falls further behind Keith's latest thinking with every passing week.

For the AI to stay current and authoritative, we need an automated pipeline that detects new content, transcribes audio/video, chunks the text, generates vector embeddings, and stores them in the Ruvector REDB brain -- all without manual developer intervention.

---

## Decision

**Build an automated content ingestion pipeline that monitors Keith's podcast RSS feed and YouTube channel for new content, transcribes audio via AssemblyAI, chunks and embeds the text, and stores vectors in Ruvector REDB. Supplement with manual upload via the admin dashboard.**

### Content Sources

| Source | Detection Method | Content Type | Frequency |
|--------|-----------------|-------------|-----------|
| Married Game Podcast | RSS feed polling | Audio (MP3) | Daily check |
| YouTube @marriedgame | YouTube Data API v3 | Auto-captions (SRT/VTT) | Daily check |
| Manual upload | Admin dashboard form (ADR-035) | Raw text | On-demand |

### Pipeline Stages

```
Detect New Content
      |
      v
Download / Extract
      |
      v
Transcribe (audio only)
      |
      v
Clean & Normalize Text
      |
      v
Chunk (500 tokens, 50-token overlap)
      |
      v
Tag Metadata (source, date, dial relevance)
      |
      v
Generate Embeddings (textToVector)
      |
      v
Store in Ruvector REDB
      |
      v
Log Ingestion Event
```

---

## Implementation

### RSS Monitor (Podcast)

```typescript
// Runs daily via cron at 02:00 UTC
async function checkPodcastFeed(): Promise<void> {
  const feed = await parseFeed(PODCAST_RSS_URL);
  const newEpisodes = feed.items.filter(
    item => !await isAlreadyIngested(item.guid)
  );
  for (const episode of newEpisodes) {
    await ingestPodcastEpisode(episode);
  }
}
```

1. Parse RSS feed using `rss-parser`
2. Compare episode GUIDs against a processed-content registry in DataStore
3. For each new episode, download the MP3 audio file
4. Send to AssemblyAI for transcription (API key already in environment config)
5. Receive transcript text, proceed to chunking

### YouTube Monitor

1. Call YouTube Data API v3 `search.list` for the @marriedgame channel, ordered by date
2. Compare video IDs against the processed-content registry
3. For each new video, fetch auto-generated captions via `captions.download`
4. If no auto-captions available, download audio and send to AssemblyAI as fallback
5. Clean caption text (remove timestamps, fix line breaks), proceed to chunking

### AssemblyAI Transcription

```typescript
async function transcribeAudio(audioUrl: string): Promise<string> {
  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
  const transcript = await client.transcripts.transcribe({
    audio_url: audioUrl,
    speaker_labels: true,     // identify Keith vs guest
    auto_chapters: true,      // segment by topic
  });
  return transcript.text;
}
```

Speaker labels help identify which content is Keith's own words versus a guest's perspective. Auto-chapters provide natural breakpoints for chunking.

### Chunking Strategy

- **Chunk size:** 500 tokens (approximately 375 words)
- **Overlap:** 50 tokens between consecutive chunks to preserve context at boundaries
- **Splitting priority:** Prefer splitting at chapter boundaries (from AssemblyAI auto_chapters), then paragraph breaks, then sentence boundaries
- **Minimum chunk size:** 100 tokens (discard fragments below this threshold)

### Metadata Tagging

Each chunk is tagged with:

```typescript
interface ChunkMetadata {
  source: 'podcast' | 'youtube' | 'manual';
  sourceId: string;          // RSS GUID or YouTube video ID
  sourceTitle: string;        // Episode or video title
  publishedAt: string;        // Original publication date
  ingestedAt: string;         // When we processed it
  chunkIndex: number;         // Position within the source
  dialRelevance: string[];    // Which of the 5 dials this relates to
  speakerLabel?: string;      // 'keith' or 'guest' if available
}
```

**Dial relevance** is determined by keyword matching against each dial's vocabulary:
- Spiritual: prayer, faith, God, church, devotion, scripture
- Mental: mindset, thoughts, focus, goals, vision, discipline
- Emotional: feelings, connection, empathy, listening, vulnerability
- Physical: fitness, health, gym, energy, appearance, strength
- Financial: money, budget, provide, career, income, investment

A chunk can be tagged with multiple dials if it spans topics.

### Embedding and Storage

```typescript
async function storeChunk(text: string, metadata: ChunkMetadata): Promise<void> {
  const vector = await textToVector(text);
  await ruvectorStore.insert({
    id: `${metadata.sourceId}-${metadata.chunkIndex}`,
    vector,
    text,
    metadata,
  });
}
```

Uses the same `textToVector` function and Ruvector REDB store that powers the existing knowledge base, ensuring new content is immediately searchable alongside the original 158 entries.

### Manual Upload (Admin Dashboard)

The admin content page (ADR-035, `/admin/content`) includes:

1. A text area for pasting raw content (blog posts, notes, transcripts)
2. Metadata fields: title, source type, dial relevance (multi-select)
3. A "Process and Ingest" button that runs the chunking, embedding, and storage pipeline
4. A table showing all ingested content with source, date, chunk count, and status

### Scheduling

| Job | Schedule | Runtime |
|-----|----------|---------|
| Podcast RSS check | Daily at 02:00 UTC | < 1 minute (feed check only) |
| Podcast transcription + ingestion | Triggered by RSS check | 5-15 minutes per episode |
| YouTube check | Daily at 03:00 UTC | < 1 minute (API check only) |
| YouTube caption ingestion | Triggered by YouTube check | 2-5 minutes per video |

Jobs run as cron tasks in the NestJS application using `@nestjs/schedule`. For production, these can be moved to Cloud Scheduler triggering Cloud Functions if the main process needs to stay lightweight.

---

## Consequences

### Positive

- Keith's AI stays current with his latest thinking automatically
- New podcast episodes and videos are searchable within hours of publication
- Manual upload gives Keith a way to add any content the automated monitors miss
- Dial relevance tagging improves RAG retrieval accuracy for topic-specific questions
- Speaker labels ensure the AI prioritizes Keith's own words over guest content

### Negative

- AssemblyAI costs approximately $0.37 per hour of audio transcription
- YouTube Data API has a daily quota (10,000 units); each search costs 100 units, limiting to ~100 checks per day
- Auto-generated YouTube captions can have transcription errors (mitigation: AssemblyAI fallback for important videos)
- Chunking at 500 tokens may split a key teaching point across two chunks (mitigation: overlap and chapter-aware splitting reduce this)

### Risks

- If Keith changes podcast hosting platforms, the RSS URL changes and the monitor breaks (mitigation: store RSS URL in admin-editable config, not hardcoded)
- YouTube API quota exhaustion if other services share the same API key (mitigation: dedicated API key for this pipeline)
- Duplicate content if the same topic appears in both podcast and video (mitigation: acceptable, RAG deduplication at query time via similarity threshold)
- Large backlog on first run if we want to ingest all historical episodes (mitigation: initial backfill is a one-time manual job, rate-limited to avoid API quota issues)
