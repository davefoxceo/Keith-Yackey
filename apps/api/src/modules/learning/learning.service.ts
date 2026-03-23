/**
 * LearningService — Ruvector-powered learning and RAG for Coach Keith AI.
 *
 * Manages three vector collections:
 *
 *   1. coaching_content  — Keith's frameworks, podcasts, book content (shared, read-only)
 *   2. conversations      — User conversation embeddings (USER-SCOPED, never shared)
 *   3. feedback_signals   — User feedback on AI responses (USER-SCOPED, never shared)
 *
 * USER ISOLATION:
 *   All conversation and feedback entries are prefixed with `user:{userId}:` so
 *   vector searches are ALWAYS filtered to the requesting user's data. A user
 *   can NEVER retrieve another user's conversation history or feedback signals.
 *   Keith's coaching content is shared (it's public content, not user data).
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KEITH_CONTENT_SEEDS as FRAMEWORK_SEEDS } from './seeds/keith-content';
import { KEITH_CONTENT_SEEDS as PODCAST_SEEDS } from './seeds/keith-content-generated';
import { RuvectorService } from './ruvector.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationEmbedding {
  conversationId: string;
  userId: string;
  summary: string;
  mode: string;
  messageCount: number;
  timestamp: string;
}

export interface FeedbackSignal {
  messageId: string;
  conversationId: string;
  userId: string;
  score: number;
  responseText: string;
  mode: string;
  timestamp: string;
}

export interface RAGContext {
  /** Relevant Keith content (shared). */
  keithContent: Array<{ id: string; text: string; topic: string; score: number }>;
  /** Relevant past conversations for THIS user only. */
  pastConversations: Array<{ id: string; summary: string; score: number }>;
  /** Learning adjustment based on user feedback. */
  learningNotes: string[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class LearningService implements OnModuleInit {
  private readonly logger = new Logger(LearningService.name);

  // Metadata store (text content keyed by vector ID, for RAG retrieval)
  private metadata = new Map<string, Record<string, unknown>>();

  // Track feedback patterns per user for response adjustment
  private userFeedbackStats = new Map<
    string,
    { positiveCount: number; negativeCount: number; preferredTopics: string[] }
  >();

  constructor(private readonly ruvector: RuvectorService) {}

  async onModuleInit() {
    // Wait for ruvector to initialize, then seed if empty
    await new Promise((r) => setTimeout(r, 500));
    await this.seedKeithContent();
    const count = await this.ruvector.count();
    this.logger.log(
      `LearningService initialized: ${count} vectors in Ruvector`,
    );
  }

  // -----------------------------------------------------------------------
  // Content Seeding (shared, read-only)
  // -----------------------------------------------------------------------

  private async seedKeithContent(): Promise<void> {
    if (!this.ruvector.isReady) {
      this.logger.warn('Ruvector not ready — content will seed on next restart');
      return;
    }

    // Check if content is already seeded (persisted in REDB)
    const existing = await this.ruvector.get('content:framework:five-dials-overview');
    if (existing) {
      const count = await this.ruvector.count();
      this.logger.log(`Content already seeded (${count} vectors in REDB)`);
      // Still load metadata map for RAG text retrieval
      this.loadMetadataMap();
      return;
    }

    // First run: seed all content
    const allSeeds = [...FRAMEWORK_SEEDS, ...PODCAST_SEEDS];
    let stored = 0;

    for (const seed of allSeeds) {
      const id = `content:${seed.id}`;
      const vector = this.ruvector.textToVector(seed.text);
      await this.ruvector.store(id, vector);
      this.metadata.set(id, {
        text: seed.text,
        sourceType: seed.sourceType,
        dial: seed.dial,
        topic: seed.topic,
      });
      stored++;
    }

    this.logger.log(`Seeded ${stored} content entries into Ruvector (REDB persisted)`);
  }

  private loadMetadataMap(): void {
    const allSeeds = [...FRAMEWORK_SEEDS, ...PODCAST_SEEDS];
    for (const seed of allSeeds) {
      this.metadata.set(`content:${seed.id}`, {
        text: seed.text,
        sourceType: seed.sourceType,
        dial: seed.dial,
        topic: seed.topic,
      });
    }
  }

  // -----------------------------------------------------------------------
  // RAG Retrieval (user-scoped conversations + shared content)
  // -----------------------------------------------------------------------

  /**
   * Retrieve relevant context for a coaching response.
   *
   * - Keith content: searched globally (it's public teaching material).
   * - Past conversations: ONLY for the requesting userId.
   * - Learning notes: derived from THIS user's feedback history.
   *
   * This is the core RAG method called before every AI response.
   */
  async getRAGContext(userId: string, userMessage: string): Promise<RAGContext> {
    const queryVector = this.ruvector.textToVector(userMessage);

    // 1. Search Keith's coaching content (shared — "content:" prefix)
    const contentResults = await this.ruvector.search(queryVector, 3, 'content:');
    const keithContent = contentResults
      .map((r) => {
        const meta = this.metadata.get(r.id);
        return {
          id: r.id,
          text: (meta?.text as string) || '',
          topic: (meta?.topic as string) || r.id,
          score: r.score,
        };
      })
      .filter((r) => r.text.length > 0);

    // 2. Search past conversations (USER-SCOPED — "user:{userId}:" prefix)
    const userPrefix = `user:${userId}:`;
    const convResults = await this.ruvector.search(queryVector, 3, userPrefix);
    const pastConversations = convResults.map((r) => {
      const meta = this.metadata.get(r.id);
      return {
        id: r.id,
        summary: (meta?.summary as string) || '',
        score: r.score,
      };
    }).filter((r) => r.summary.length > 0);

    // 3. Learning notes from feedback history
    const learningNotes = this.getLearningNotes(userId);

    this.logger.debug(
      `Ruvector RAG: ${keithContent.length} content, ${pastConversations.length} user conversations`,
    );

    return { keithContent, pastConversations, learningNotes };
  }

  // -----------------------------------------------------------------------
  // Conversation Storage (user-scoped)
  // -----------------------------------------------------------------------

  /**
   * Store a conversation embedding after an exchange.
   *
   * The entry is keyed as `user:{userId}:conv:{conversationId}` so it
   * can ONLY be retrieved when searching with that user's prefix.
   */
  storeConversationEmbedding(data: ConversationEmbedding): void {
    const id = `user:${data.userId}:conv:${data.conversationId}`;
    const vector = this.ruvector.textToVector(data.summary);

    // Store in Ruvector (REDB-persisted, survives restarts)
    this.ruvector.store(id, vector).catch((e) =>
      this.logger.error(`Ruvector store failed: ${e.message}`),
    );

    // Store metadata for retrieval
    this.metadata.set(id, {
      conversationId: data.conversationId,
      userId: data.userId,
      summary: data.summary,
      mode: data.mode,
      messageCount: data.messageCount,
      timestamp: data.timestamp,
    });

    this.logger.debug(
      `Stored conversation embedding: ${id} (${data.messageCount} messages)`,
    );
  }

  /**
   * Update a conversation embedding as more messages are exchanged.
   */
  updateConversationEmbedding(data: ConversationEmbedding): void {
    const id = `user:${data.userId}:conv:${data.conversationId}`;
    this.ruvector.delete(id).catch(() => {});
    this.storeConversationEmbedding(data);
  }

  // -----------------------------------------------------------------------
  // Feedback / Learning Signals (user-scoped)
  // -----------------------------------------------------------------------

  /**
   * Record a feedback signal when a user rates an AI response.
   *
   * Positive feedback (score >= 4) teaches the system what works.
   * Negative feedback (score <= 2) teaches the system what to avoid.
   *
   * Entry is keyed as `user:{userId}:fb:{messageId}` — user-scoped.
   */
  recordFeedbackSignal(data: FeedbackSignal): void {
    const id = `user:${data.userId}:fb:${data.messageId}`;
    const vector = this.ruvector.textToVector(data.responseText);

    // Store in Ruvector (REDB-persisted)
    this.ruvector.store(id, vector).catch((e) =>
      this.logger.error(`Ruvector feedback store failed: ${e.message}`),
    );

    // Store metadata
    this.metadata.set(id, {
      messageId: data.messageId,
      conversationId: data.conversationId,
      userId: data.userId,
      score: data.score,
      mode: data.mode,
      responseSnippet: data.responseText.substring(0, 200),
      timestamp: data.timestamp,
    });

    // Update per-user feedback stats
    const stats = this.userFeedbackStats.get(data.userId) ?? {
      positiveCount: 0,
      negativeCount: 0,
      preferredTopics: [],
    };

    if (data.score >= 4) {
      stats.positiveCount++;
    } else if (data.score <= 2) {
      stats.negativeCount++;
    }

    this.userFeedbackStats.set(data.userId, stats);

    this.logger.debug(
      `Feedback recorded: user=${data.userId}, score=${data.score}, message=${data.messageId}`,
    );
  }

  // -----------------------------------------------------------------------
  // Learning Notes (derived from user's own feedback)
  // -----------------------------------------------------------------------

  /**
   * Generate learning notes for a user based on their feedback patterns.
   *
   * These notes are injected into the system prompt to personalize
   * responses. Only uses THIS user's data.
   */
  private getLearningNotes(userId: string): string[] {
    const notes: string[] = [];
    const stats = this.userFeedbackStats.get(userId);

    if (!stats) return notes;

    // Analyze feedback patterns
    const totalFeedback = stats.positiveCount + stats.negativeCount;
    if (totalFeedback === 0) return notes;

    const positiveRate = stats.positiveCount / totalFeedback;

    if (positiveRate > 0.7) {
      notes.push(
        'This user generally responds well to your coaching style. Continue with your current approach.',
      );
    } else if (positiveRate < 0.4) {
      notes.push(
        'This user has given mixed feedback. Try being more specific, asking more questions, and checking in more often.',
      );
    }

    // Check metadata for feedback patterns
    const positiveFeedback: Array<{ metadata: Record<string, unknown> }> = [];
    const negativeFeedback: Array<{ metadata: Record<string, unknown> }> = [];
    for (const [key, meta] of this.metadata) {
      if (key.startsWith(`user:${userId}:fb:`) && meta.score != null) {
        const entry = { metadata: meta };
        if ((meta.score as number) >= 4) positiveFeedback.push(entry);
        else if ((meta.score as number) <= 2) negativeFeedback.push(entry);
      }
    }

    if (positiveFeedback.length > 0) {
      const modes = positiveFeedback.map((f) => f.metadata.mode as string);
      const preferredMode = mode(modes);
      if (preferredMode) {
        notes.push(
          `This user tends to prefer the ${preferredMode} coaching mode.`,
        );
      }
    }

    if (negativeFeedback.length >= 2) {
      notes.push(
        'Some of your previous responses didn\'t resonate. Try a different angle or ask what they need.',
      );
    }

    return notes;
  }

  // -----------------------------------------------------------------------
  // Metrics
  // -----------------------------------------------------------------------

  async getMetrics() {
    const count = await this.ruvector.count();
    return {
      totalVectors: count,
      metadataEntries: this.metadata.size,
      usersWithFeedback: this.userFeedbackStats.size,
      storage: 'Ruvector REDB (native HNSW)',
    };
  }

  /** Get metrics scoped to a specific user. */
  getUserMetrics(userId: string) {
    let conversations = 0;
    let feedbackSignals = 0;
    for (const key of this.metadata.keys()) {
      if (key.startsWith(`user:${userId}:conv:`)) conversations++;
      if (key.startsWith(`user:${userId}:fb:`)) feedbackSignals++;
    }
    return {
      conversations,
      feedbackSignals,
      stats: this.userFeedbackStats.get(userId) ?? null,
    };
  }
}

// Utility: find the mode (most common element) of an array
function mode(arr: string[]): string | null {
  const counts = new Map<string, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  let maxCount = 0;
  let maxItem: string | null = null;
  for (const [item, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxItem = item;
    }
  }
  return maxItem;
}
