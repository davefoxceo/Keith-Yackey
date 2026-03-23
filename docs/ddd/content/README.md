# Content Bounded Context

## Overview

The Content Context manages Coach Keith's entire content library -- 88 podcast episodes, an ebook, video clips, and extracted frameworks. It handles ingestion from external sources (RSS feeds, uploaded files, Instagram), transcription via AssemblyAI, chunking for RAG retrieval, and embedding generation. This context transforms raw content into AI-consumable knowledge that powers the Coaching Context's responses.

**Core Responsibilities:**
- Detect and ingest new podcast episodes from RSS feeds
- Manage transcription pipeline (AssemblyAI integration)
- Post-process transcripts for accuracy and structure
- Chunk content into semantically meaningful segments with embedding vectors
- Ingest and structure the ebook into chapters and sections
- Extract and catalog coaching frameworks from content
- Generate and store embedding vectors for RAG retrieval
- Manage video clips and key moment highlights
- Track content quality and review status

**Upstream Dependencies:** None (this is a source context -- content flows outward)

**Downstream Consumers:** Coaching Context (RAG retrieval for AI responses), Engagement Context (content references in prompts), Community Context (content sharing)

---

## Aggregates

### PodcastEpisode

The PodcastEpisode aggregate represents a single podcast episode and its full processing lifecycle from detection through transcription and embedding.

```typescript
interface PodcastEpisode {
  readonly id: EpisodeId;
  readonly title: string;
  readonly description: string;
  readonly publishedAt: Timestamp;
  readonly audioUrl: string;
  readonly durationSeconds: number;
  readonly rssSource: RSSFeedSource;
  transcript: Transcript | null;
  transcriptionStatus: TranscriptionStatus;
  topicTags: TopicTag[];
  dialRelevance: DialRelevance[];
  keyMomentClips: KeyMomentClip[];
  contentRating: ContentRating | null;
  processingStatus: EpisodeProcessingStatus;

  startTranscription(jobId: string): NewEpisodeDetected;
  completeTranscription(transcript: Transcript): EpisodeTranscribed;
  postProcessTranscript(corrections: TranscriptCorrection[]): TranscriptPostProcessed;
  extractFrameworks(): FrameworkDocumentCreated[];
  tagContent(tags: TopicTag[], dialRelevance: DialRelevance[]): void;
  addKeyMomentClip(clip: KeyMomentClip): void;
  reviewQuality(rating: ContentRating): ContentQualityReviewed;
}

type EpisodeProcessingStatus =
  | 'detected'
  | 'transcribing'
  | 'transcribed'
  | 'post_processed'
  | 'chunked'
  | 'embedded'
  | 'reviewed'
  | 'published';
```

**Invariants:**
- Transcription cannot start if audio URL is invalid or unreachable
- Post-processing can only occur after transcription is complete
- Chunking can only occur after post-processing
- Embedding can only occur after chunking
- An episode cannot be published until it has been reviewed
- Topic tags must include at least one DialRelevance mapping
- Key moment clips must reference valid timestamp ranges within the episode duration

### BookContent

The BookContent aggregate represents the ingested ebook, structured into chapters and sections.

```typescript
interface BookContent {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly ingestedAt: Timestamp;
  chapters: BookChapter[];
  totalWordCount: number;
  processingStatus: 'ingesting' | 'chunked' | 'embedded' | 'reviewed';

  ingest(rawContent: string, structure: BookStructure): BookIngested;
  getChapter(chapterNumber: number): BookChapter | null;
  getAllFrameworks(): Framework[];
}
```

**Invariants:**
- Chapter numbers must be sequential starting from 1
- Every chapter must have at least one section
- Total word count must equal the sum of all chapter word counts

### ContentChunk

The ContentChunk aggregate represents a semantically meaningful piece of content prepared for RAG retrieval.

```typescript
interface ContentChunk {
  readonly id: string;
  readonly sourceType: ContentSourceType;
  readonly sourceId: string; // EpisodeId or BookContent id
  metadata: ChunkMetadata;
  textContent: string;
  embeddingVector: EmbeddingVector | null;
  topicTags: TopicTag[];
  dialRelevance: DialRelevance[];

  generateEmbedding(vector: EmbeddingVector): ContentChunkEmbedded;
  updateMetadata(metadata: Partial<ChunkMetadata>): void;
}
```

**Invariants:**
- Text content must be between 100 and 2000 characters
- Chunks must overlap with adjacent chunks by 10-20% for retrieval continuity
- Each chunk must have a valid source reference
- Embedding vector dimensions must match the configured embedding model (e.g., 1536 for text-embedding-3-small)
- A chunk cannot exist without at least one topic tag

---

## Entities

### Transcript

The full transcription of a podcast episode, including speaker identification and timestamps.

```typescript
interface Transcript {
  readonly id: string;
  readonly episodeId: EpisodeId;
  readonly assemblyAiJobId: string;
  segments: TranscriptSegment[];
  fullText: string;
  confidence: number; // 0-1 overall confidence
  language: string;
  createdAt: Timestamp;
  postProcessedAt: Timestamp | null;
  corrections: TranscriptCorrection[];
}
```

### TranscriptSegment

A time-stamped segment of a transcript with speaker identification.

```typescript
interface TranscriptSegment {
  readonly id: string;
  readonly transcriptId: string;
  speaker: 'keith' | 'guest' | 'unknown';
  text: string;
  startTimeMs: number;
  endTimeMs: number;
  confidence: number;
  words: TranscriptWord[];
}

interface TranscriptWord {
  readonly text: string;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly confidence: number;
}

interface TranscriptCorrection {
  readonly segmentId: string;
  readonly originalText: string;
  readonly correctedText: string;
  readonly reason: 'name_correction' | 'terminology' | 'grammar' | 'context';
}
```

### BookChapter

A chapter of the ebook with structured sections.

```typescript
interface BookChapter {
  readonly id: string;
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly title: string;
  sections: BookSection[];
  wordCount: number;
  topicTags: TopicTag[];
  dialRelevance: DialRelevance[];
  frameworks: Framework[];
}

interface BookSection {
  readonly id: string;
  readonly chapterId: string;
  readonly sectionNumber: number;
  readonly title: string | null;
  readonly content: string;
  readonly wordCount: number;
}

interface BookStructure {
  readonly chapters: {
    readonly title: string;
    readonly sections: { title: string | null; content: string }[];
  }[];
}
```

### VideoClip

A video clip extracted from content or uploaded separately (e.g., Instagram content).

```typescript
interface VideoClip {
  readonly id: string;
  readonly sourceType: 'podcast_video' | 'instagram' | 'standalone';
  readonly sourceId: string | null;
  readonly title: string;
  readonly description: string;
  readonly videoUrl: string;
  readonly thumbnailUrl: string;
  readonly durationSeconds: number;
  readonly startTimeMs: number | null; // For clips extracted from longer content
  readonly endTimeMs: number | null;
  topicTags: TopicTag[];
  dialRelevance: DialRelevance[];
  createdAt: Timestamp;
}
```

### Framework

A coaching framework extracted from Keith's content -- a structured mental model or process.

```typescript
interface Framework {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly sourceType: ContentSourceType;
  readonly sourceId: string;
  readonly sourceLocation: string; // Chapter number, timestamp, etc.
  steps: FrameworkStep[];
  dialRelevance: DialRelevance[];
  topicTags: TopicTag[];
  createdAt: Timestamp;
}

interface FrameworkStep {
  readonly order: number;
  readonly title: string;
  readonly description: string;
  readonly actionPrompt: string; // What the user should do
}
```

### KeyMomentClip

A highlighted moment within a podcast episode -- a particularly impactful quote, story, or teaching.

```typescript
interface KeyMomentClip {
  readonly id: string;
  readonly episodeId: EpisodeId;
  readonly title: string;
  readonly description: string;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly transcriptText: string;
  readonly significance: 'quote' | 'story' | 'framework' | 'breakthrough' | 'practical_tip';
  topicTags: TopicTag[];
}
```

---

## Value Objects

```typescript
/** Unique identifier for a podcast episode */
interface EpisodeId {
  readonly value: string; // UUID
}

/** Type of content source */
type ContentSourceType = 'podcast' | 'book' | 'instagram' | 'framework_doc' | 'video_clip';

/** Metadata attached to a content chunk for retrieval context */
interface ChunkMetadata {
  readonly sourceType: ContentSourceType;
  readonly sourceId: string;
  readonly sourceTitle: string;
  readonly chunkIndex: number;
  readonly totalChunks: number;
  readonly startOffset: number; // Character offset in source
  readonly endOffset: number;
  readonly timestampMs: number | null; // For audio/video content
  readonly chapterNumber: number | null; // For book content
  readonly speaker: string | null; // For transcript content
}

/** Vector embedding for semantic search */
interface EmbeddingVector {
  readonly dimensions: number;
  readonly values: number[]; // Float array
  readonly model: string; // e.g., 'text-embedding-3-small'
  readonly generatedAt: Timestamp;
}

/** A topic tag for content categorization */
interface TopicTag {
  readonly slug: string; // e.g., 'communication', 'conflict-resolution', 'intimacy'
  readonly label: string;
  readonly category: 'relationship' | 'personal_growth' | 'faith' | 'practical' | 'emotional';
}

/** Maps content relevance to a specific dial */
interface DialRelevance {
  readonly dial: DialType;
  readonly relevanceScore: number; // 0-1, how relevant this content is to the dial
  readonly isPrimary: boolean; // Whether this is the primary dial for this content
}

/** Quality rating for reviewed content */
interface ContentRating {
  readonly overallScore: number; // 1-5
  readonly accuracyScore: number; // 1-5, transcript/content accuracy
  readonly relevanceScore: number; // 1-5, relevance to coaching mission
  readonly reviewedAt: Timestamp;
  readonly reviewedBy: 'automated' | 'manual';
  readonly notes: string | null;
}

/** RSS feed source configuration */
interface RSSFeedSource {
  readonly feedUrl: string;
  readonly feedTitle: string;
  readonly lastCheckedAt: Timestamp;
  readonly lastEpisodeDate: Timestamp | null;
  readonly checkIntervalMinutes: number;
}

/** Current state of transcription processing */
type TranscriptionStatus =
  | 'pending'
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'post_processed';
```

---

## Domain Events

```typescript
interface NewEpisodeDetected {
  readonly eventType: 'content.new_episode_detected';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly episodeId: EpisodeId;
    readonly title: string;
    readonly audioUrl: string;
    readonly publishedAt: Timestamp;
    readonly rssSource: RSSFeedSource;
  };
}

interface EpisodeTranscribed {
  readonly eventType: 'content.episode_transcribed';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly episodeId: EpisodeId;
    readonly transcriptId: string;
    readonly segmentCount: number;
    readonly confidence: number;
    readonly durationSeconds: number;
  };
}

interface TranscriptPostProcessed {
  readonly eventType: 'content.transcript_post_processed';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly episodeId: EpisodeId;
    readonly transcriptId: string;
    readonly correctionsApplied: number;
    readonly finalConfidence: number;
  };
}

interface ContentChunkEmbedded {
  readonly eventType: 'content.chunk_embedded';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly chunkId: string;
    readonly sourceType: ContentSourceType;
    readonly sourceId: string;
    readonly embeddingModel: string;
    readonly dimensions: number;
  };
}

interface BookIngested {
  readonly eventType: 'content.book_ingested';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly bookId: string;
    readonly title: string;
    readonly chapterCount: number;
    readonly totalWordCount: number;
  };
}

interface FrameworkDocumentCreated {
  readonly eventType: 'content.framework_document_created';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly frameworkId: string;
    readonly name: string;
    readonly sourceType: ContentSourceType;
    readonly sourceId: string;
    readonly stepCount: number;
    readonly dialRelevance: DialRelevance[];
  };
}

interface ContentQualityReviewed {
  readonly eventType: 'content.quality_reviewed';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly contentType: ContentSourceType;
    readonly contentId: string;
    readonly rating: ContentRating;
    readonly approved: boolean;
  };
}

interface InstagramContentIngested {
  readonly eventType: 'content.instagram_content_ingested';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly videoClipId: string;
    readonly instagramPostId: string;
    readonly title: string;
    readonly durationSeconds: number;
    readonly topicTags: TopicTag[];
  };
}
```

---

## Repositories

```typescript
interface PodcastEpisodeRepository {
  /** Find episode by ID */
  findById(id: EpisodeId): Promise<PodcastEpisode | null>;

  /** Find episode by RSS GUID to prevent duplicates */
  findByRssGuid(guid: string): Promise<PodcastEpisode | null>;

  /** Get all episodes, paginated and sorted by publish date */
  findAll(pagination: PaginatedResult<PodcastEpisode>): Promise<PaginatedResult<PodcastEpisode>>;

  /** Find episodes by processing status (for pipeline management) */
  findByProcessingStatus(status: EpisodeProcessingStatus): Promise<PodcastEpisode[]>;

  /** Find episodes relevant to a specific dial */
  findByDialRelevance(dial: DialType, minRelevance: number): Promise<PodcastEpisode[]>;

  /** Persist an episode */
  save(episode: PodcastEpisode): Promise<void>;
}

interface BookContentRepository {
  /** Find book by ID */
  findById(id: string): Promise<BookContent | null>;

  /** Get all ingested books */
  findAll(): Promise<BookContent[]>;

  /** Find chapters by topic tag */
  findChaptersByTag(tag: TopicTag): Promise<BookChapter[]>;

  /** Persist book content */
  save(book: BookContent): Promise<void>;
}

interface ContentChunkRepository {
  /** Find chunk by ID */
  findById(id: string): Promise<ContentChunk | null>;

  /** Find chunks by source */
  findBySource(sourceType: ContentSourceType, sourceId: string): Promise<ContentChunk[]>;

  /** Semantic search: find chunks nearest to a query embedding */
  findByEmbeddingSimilarity(
    queryVector: EmbeddingVector,
    limit: number,
    filters?: {
      sourceTypes?: ContentSourceType[];
      dialRelevance?: DialType;
      minRelevanceScore?: number;
      topicTags?: string[];
    }
  ): Promise<{ chunk: ContentChunk; similarity: number }[]>;

  /** Find chunks that do not yet have embeddings */
  findUnembedded(limit: number): Promise<ContentChunk[]>;

  /** Persist a chunk */
  save(chunk: ContentChunk): Promise<void>;

  /** Batch persist chunks */
  saveBatch(chunks: ContentChunk[]): Promise<void>;
}

interface FrameworkRepository {
  /** Find framework by ID */
  findById(id: string): Promise<Framework | null>;

  /** Find all frameworks */
  findAll(): Promise<Framework[]>;

  /** Find frameworks by dial relevance */
  findByDial(dial: DialType): Promise<Framework[]>;

  /** Find frameworks by topic tag */
  findByTag(tag: string): Promise<Framework[]>;

  /** Persist a framework */
  save(framework: Framework): Promise<void>;
}

interface VideoClipRepository {
  /** Find video clip by ID */
  findById(id: string): Promise<VideoClip | null>;

  /** Find clips by source */
  findBySource(sourceType: VideoClip['sourceType'], sourceId: string): Promise<VideoClip[]>;

  /** Find clips by topic */
  findByTag(tag: string): Promise<VideoClip[]>;

  /** Persist a clip */
  save(clip: VideoClip): Promise<void>;
}

interface IngestionJobRepository {
  /** Get current state of an ingestion job */
  findById(jobId: string): Promise<IngestionJob | null>;

  /** Find active jobs */
  findActive(): Promise<IngestionJob[]>;

  /** Find failed jobs for retry */
  findFailed(maxRetries: number): Promise<IngestionJob[]>;

  /** Persist job state */
  save(job: IngestionJob): Promise<void>;
}

interface IngestionJob {
  readonly id: string;
  readonly sourceType: ContentSourceType;
  readonly sourceId: string;
  readonly pipeline: IngestionPipelineStep[];
  currentStep: IngestionPipelineStep;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'retrying';
  retryCount: number;
  error: string | null;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
}

type IngestionPipelineStep =
  | 'fetch'
  | 'transcribe'
  | 'post_process'
  | 'chunk'
  | 'embed'
  | 'tag'
  | 'review';
```

---

## Domain Services

### ContentIngestionService

Orchestrates the multi-step content ingestion pipeline.

```typescript
interface ContentIngestionService {
  /** Check RSS feed for new episodes and start ingestion */
  pollRSSFeed(source: RSSFeedSource): Promise<NewEpisodeDetected[]>;

  /** Run the full ingestion pipeline for an episode */
  ingestEpisode(episodeId: EpisodeId): Promise<IngestionJob>;

  /** Ingest book content from raw text */
  ingestBook(title: string, author: string, rawContent: string): Promise<BookIngested>;

  /** Ingest Instagram video content */
  ingestInstagramContent(postUrl: string): Promise<InstagramContentIngested>;

  /** Retry a failed ingestion job from the failed step */
  retryJob(jobId: string): Promise<IngestionJob>;
}
```

### ContentChunkingService

Splits content into semantically meaningful chunks for embedding.

```typescript
interface ContentChunkingService {
  /** Chunk a transcript into overlapping segments */
  chunkTranscript(
    transcript: Transcript,
    options: ChunkingOptions
  ): Promise<ContentChunk[]>;

  /** Chunk book content by sections with overlap */
  chunkBook(book: BookContent, options: ChunkingOptions): Promise<ContentChunk[]>;

  /** Re-chunk content with updated options */
  rechunk(sourceType: ContentSourceType, sourceId: string, options: ChunkingOptions): Promise<ContentChunk[]>;
}

interface ChunkingOptions {
  readonly targetChunkSize: number; // Target characters per chunk
  readonly overlapPercentage: number; // 0.1 - 0.2
  readonly respectSpeakerBoundaries: boolean; // For transcripts
  readonly respectSectionBoundaries: boolean; // For book content
}
```

### ContentRetrievalService

Provides semantic search across all content for the Coaching Context.

```typescript
interface ContentRetrievalService {
  /** Find the most relevant content chunks for a coaching query */
  findRelevantContent(
    query: string,
    context: {
      dialFocus?: DialType;
      marriageStage?: MarriageStage;
      topicPreferences?: string[];
      excludeSourceIds?: string[];
    },
    limit: number
  ): Promise<RetrievalResult[]>;

  /** Find frameworks relevant to a coaching topic */
  findRelevantFrameworks(
    query: string,
    dialFocus?: DialType
  ): Promise<Framework[]>;
}

interface RetrievalResult {
  readonly chunk: ContentChunk;
  readonly similarityScore: number;
  readonly sourceTitle: string;
  readonly sourceType: ContentSourceType;
  readonly contextSnippet: string;
}
```
