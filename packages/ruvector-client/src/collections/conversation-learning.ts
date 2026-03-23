/**
 * ConversationLearningStore - The self-learning conversation memory.
 *
 * This is the KEY differentiator of Coach Keith AI.  Every completed
 * conversation is stored as a vector embedding alongside a quality signal.
 * The SONA engine uses these signals to continuously refine its internal
 * weights, so retrieval and response quality improve with EVERY interaction.
 *
 * Flow:
 *  1. User completes a conversation.
 *  2. `storeConversation()` persists the conversation embedding.
 *  3. `storeUserFeedback()` records the user's explicit satisfaction signal.
 *  4. `learnFromOutcome()` feeds the outcome through SONA as a trajectory
 *     so the system adapts its LoRA weights.
 *  5. Next time `getRelevantPastConversations()` is called, the search
 *     uses SONA-optimized embeddings that incorporate everything learned
 *     so far.
 */

import type { SearchResult } from '@ruvector/core';
import type { RuvectorClient, CollectionName } from '../client';
import type { LearningEngine, LearningSignalKind } from '../learning';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationRecord {
  /** Conversation identifier. */
  id: string;
  /** The user who participated. */
  userId: string;
  /** Pre-computed embedding of the full conversation (e.g. averaged turn embeddings). */
  embedding: number[];
  /** Conversation mode (free_chat, crisis, framework, accountability). */
  mode: string;
  /** Number of messages exchanged. */
  messageCount: number;
  /** ISO timestamp of when the conversation ended. */
  completedAt: string;
}

export interface UserFeedback {
  /** Explicit satisfaction score in [0, 1]. */
  satisfaction: number;
  /** Whether the user marked the conversation as helpful. */
  helpful: boolean;
  /** Optional free-text comment from the user. */
  comment?: string;
}

export interface ConversationOutcome {
  /** Unique outcome identifier. */
  id: string;
  /** Related conversation. */
  conversationId: string;
  /** Embedding that captures the outcome context. */
  embedding: number[];
  /** Outcome quality in [0, 1]. */
  quality: number;
  /** Which dials were affected. */
  dialAdjustments?: Record<string, number>;
  /** Free-form metadata. */
  metadata?: Record<string, unknown>;
}

export interface PastConversationResult {
  /** Conversation identifier. */
  id: string;
  /** Cosine similarity to the current context. */
  score: number;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const COLLECTION: CollectionName = 'conversation_history';
const SIGNALS_COLLECTION: CollectionName = 'learning_signals';

export class ConversationLearningStore {
  private readonly client: RuvectorClient;
  private readonly learning: LearningEngine;

  constructor(client: RuvectorClient, learning: LearningEngine) {
    this.client = client;
    this.learning = learning;
  }

  // -----------------------------------------------------------------------
  // Store conversations
  // -----------------------------------------------------------------------

  /** Persist a completed conversation's embedding. */
  async storeConversation(record: ConversationRecord): Promise<string> {
    return this.client.store(COLLECTION, {
      id: record.id,
      vector: new Float32Array(record.embedding),
    });
  }

  // -----------------------------------------------------------------------
  // Feedback & learning
  // -----------------------------------------------------------------------

  /**
   * Store explicit user feedback and feed it into the SONA engine.
   *
   * The feedback is converted into a learning signal so the system's LoRA
   * weights shift toward producing more of whatever the user found helpful.
   */
  async storeUserFeedback(
    conversationId: string,
    userId: string,
    conversationEmbedding: number[],
    feedback: UserFeedback,
  ): Promise<void> {
    const signalId = `feedback:${conversationId}:${Date.now()}`;

    await this.learning.processLearningSignal({
      id: signalId,
      userId,
      kind: 'user_feedback' as LearningSignalKind,
      quality: feedback.satisfaction,
      contextEmbedding: conversationEmbedding,
      payload: {
        conversationId,
        helpful: feedback.helpful,
        comment: feedback.comment,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Process a conversation outcome through the SONA learning pipeline.
   *
   * This is where the magic happens: the outcome quality score drives
   * micro-LoRA weight updates so every future search and retrieval is
   * slightly better tuned to what actually works for this user.
   */
  async learnFromOutcome(
    userId: string,
    outcome: ConversationOutcome,
  ): Promise<void> {
    // Store the outcome embedding in the learning_signals collection.
    await this.client.store(SIGNALS_COLLECTION, {
      id: outcome.id,
      vector: new Float32Array(outcome.embedding),
    });

    // Create a learning signal from the outcome.
    await this.learning.processLearningSignal({
      id: outcome.id,
      userId,
      kind: 'conversation_outcome' as LearningSignalKind,
      quality: outcome.quality,
      contextEmbedding: outcome.embedding,
      payload: {
        conversationId: outcome.conversationId,
        dialAdjustments: outcome.dialAdjustments,
        ...outcome.metadata,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // -----------------------------------------------------------------------
  // Retrieval
  // -----------------------------------------------------------------------

  /**
   * Find past conversations whose context is most similar to the current
   * one.  When SONA is active the query embedding is transformed through
   * learned weights first, so the results automatically benefit from all
   * prior feedback and outcomes.
   */
  async getRelevantPastConversations(
    userId: string,
    currentContextEmbedding: number[],
    limit = 5,
  ): Promise<PastConversationResult[]> {
    // Use the learning engine to optimize the search.
    const { transformedQuery, suggestedK, suggestedEfSearch } =
      this.learning.getOptimizedSearchParams(currentContextEmbedding);

    const k = Math.min(limit, suggestedK);

    const results: SearchResult[] = await this.client.search(
      COLLECTION,
      transformedQuery,
      k,
      suggestedEfSearch,
    );

    return results.map((r) => ({ id: r.id, score: r.score }));
  }

  // -----------------------------------------------------------------------
  // Multi-step trajectory tracking
  // -----------------------------------------------------------------------

  /**
   * Begin tracking a live conversation so SONA can learn from the full
   * arc, not just the final outcome.  Call `addTurn()` for each exchange
   * and `completeConversation()` at the end.
   */
  beginTracking(conversationId: string, initialEmbedding: number[]): string {
    return this.learning.beginConversationTrajectory(
      conversationId,
      initialEmbedding,
    );
  }

  /** Record a single conversational turn within a tracked conversation. */
  addTurn(
    conversationId: string,
    turnEmbedding: number[],
    turnQuality: number,
  ): void {
    this.learning.addTrajectoryStep(
      conversationId,
      turnEmbedding,
      turnQuality,
    );
  }

  /**
   * Finalize a tracked conversation.  The `overallQuality` drives the
   * SONA weight update for the entire trajectory.
   */
  completeConversation(
    conversationId: string,
    overallQuality: number,
  ): void {
    this.learning.endConversationTrajectory(conversationId, overallQuality);
  }

  // -----------------------------------------------------------------------
  // Maintenance
  // -----------------------------------------------------------------------

  /** Number of conversations stored. */
  async count(): Promise<number> {
    return this.client.getCollection(COLLECTION).len();
  }
}
