/**
 * CoachingKnowledgeStore - Semantic store for Coach Keith's content library.
 *
 * Stores and retrieves podcast transcripts, book chapters, frameworks, and
 * coaching session excerpts as vector embeddings so the AI can pull the most
 * relevant Keith Yackey content into any conversation via RAG.
 */

import type { SearchResult } from '@ruvector/core';
import type { RuvectorClient, CollectionName } from '../client';
import type { LearningEngine } from '../learning';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentSourceType =
  | 'PODCAST'
  | 'BOOK'
  | 'INSTAGRAM'
  | 'COACHING_SESSION'
  | 'FRAMEWORK'
  | 'RECORDING';

export type DialType =
  | 'PARENT'
  | 'PARTNER'
  | 'PRODUCER'
  | 'PLAYER'
  | 'POWER';

export interface ContentChunkInput {
  /** Stable identifier for the chunk. */
  id: string;
  /** Identifier of the source document / episode / chapter. */
  sourceId: string;
  /** Type of source material. */
  sourceType: ContentSourceType;
  /** Raw text of the chunk. */
  text: string;
  /** Pre-computed embedding vector for the chunk text. */
  embedding: number[];
  /** Optional metadata attached to the chunk. */
  metadata?: ContentChunkMetadata;
}

export interface ContentChunkMetadata {
  speaker?: string;
  timestamp?: number;
  topic?: string;
  dial?: DialType;
  /** Additional free-form fields. */
  [key: string]: unknown;
}

export interface ContentSearchResult {
  /** Chunk identifier. */
  id: string;
  /** Cosine similarity score from the vector search. */
  score: number;
}

export interface ContentSearchOptions {
  /** Maximum number of results to return (default 10). */
  k?: number;
  /** HNSW efSearch beam width override. */
  efSearch?: number;
  /** When true, the query embedding is passed through SONA micro-LoRA first. */
  useLearning?: boolean;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const COLLECTION: CollectionName = 'coaching_chunks';

export class CoachingKnowledgeStore {
  private readonly client: RuvectorClient;
  private readonly learning: LearningEngine | null;

  constructor(client: RuvectorClient, learning?: LearningEngine) {
    this.client = client;
    this.learning = learning ?? null;
  }

  // -----------------------------------------------------------------------
  // Write
  // -----------------------------------------------------------------------

  /**
   * Store a single content chunk with its embedding.
   *
   * The chunk text and metadata are NOT stored in the vector DB itself --
   * only the embedding and the chunk id.  Text/metadata should live in
   * your primary database (Supabase, Firestore, etc.) keyed by chunk id.
   */
  async storeContentChunk(chunk: ContentChunkInput): Promise<string> {
    return this.client.store(COLLECTION, {
      id: chunk.id,
      vector: new Float32Array(chunk.embedding),
    });
  }

  /** Batch-store multiple content chunks. */
  async storeContentChunks(chunks: ContentChunkInput[]): Promise<string[]> {
    return this.client.storeBatch(
      COLLECTION,
      chunks.map((c) => ({
        id: c.id,
        vector: new Float32Array(c.embedding),
      })),
    );
  }

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  /**
   * Run a semantic search for content relevant to the given query embedding.
   *
   * When `useLearning` is true (the default) and SONA is available, the
   * query is first transformed through the learned micro-LoRA weights so
   * results reflect everything the system has learned from past
   * conversations.
   */
  async searchRelevantContent(
    queryEmbedding: number[],
    options: ContentSearchOptions = {},
  ): Promise<ContentSearchResult[]> {
    const { k = 10, efSearch, useLearning = true } = options;

    let searchVector: number[] | Float32Array = queryEmbedding;
    let searchK = k;
    let searchEf = efSearch;

    if (useLearning && this.learning) {
      const optimized = this.learning.getOptimizedSearchParams(queryEmbedding);
      searchVector = optimized.transformedQuery;
      searchK = k ?? optimized.suggestedK;
      searchEf = efSearch ?? optimized.suggestedEfSearch;
    }

    const results: SearchResult[] = await this.client.search(
      COLLECTION,
      searchVector,
      searchK,
      searchEf,
    );

    return results.map((r) => ({ id: r.id, score: r.score }));
  }

  /**
   * Get content relevant to a specific Five Dials dial.
   *
   * This relies on a dial-specific probe embedding.  The caller must
   * provide an embedding that semantically represents the target dial
   * (e.g. the embedding of "being a great parent and father").
   */
  async getByDialRelevance(
    dialEmbedding: number[],
    limit = 10,
  ): Promise<ContentSearchResult[]> {
    return this.searchRelevantContent(dialEmbedding, { k: limit });
  }

  /**
   * Get content matching a topic.
   *
   * Like `getByDialRelevance`, the caller supplies a topic embedding
   * (e.g. the embedding of "accountability partners in marriage").
   */
  async getByTopic(
    topicEmbedding: number[],
    limit = 10,
  ): Promise<ContentSearchResult[]> {
    return this.searchRelevantContent(topicEmbedding, { k: limit });
  }

  // -----------------------------------------------------------------------
  // Maintenance
  // -----------------------------------------------------------------------

  /** Remove a content chunk from the store. */
  async removeChunk(id: string): Promise<boolean> {
    return this.client.remove(COLLECTION, id);
  }

  /** Get the total number of chunks indexed. */
  async count(): Promise<number> {
    return this.client.getCollection(COLLECTION).len();
  }
}
