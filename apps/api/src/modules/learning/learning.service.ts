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
import {
  InMemoryVectorStore,
  textToVector,
  type SearchResult,
} from './vector-store';
import { KEITH_CONTENT_SEEDS as FRAMEWORK_SEEDS } from './seeds/keith-content';
import { KEITH_CONTENT_SEEDS as PODCAST_SEEDS } from './seeds/keith-content-generated';
import { PiBrainService } from './pi-brain.service';

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

  // Fallback in-memory stores (used when Pi-Brain is unavailable)
  private readonly contentStore = new InMemoryVectorStore();
  private readonly conversationStore = new InMemoryVectorStore();
  private readonly feedbackStore = new InMemoryVectorStore();

  // Track feedback patterns per user for response adjustment
  private userFeedbackStats = new Map<
    string,
    { positiveCount: number; negativeCount: number; preferredTopics: string[] }
  >();

  constructor(private readonly piBrain: PiBrainService) {}

  async onModuleInit() {
    this.seedKeithContent();
    this.logger.log(
      `LearningService initialized: ${this.contentStore.count()} content entries seeded`,
    );
  }

  // -----------------------------------------------------------------------
  // Content Seeding (shared, read-only)
  // -----------------------------------------------------------------------

  private seedKeithContent(): void {
    // Combine hand-written frameworks + generated podcast content
    const allSeeds = [...FRAMEWORK_SEEDS, ...PODCAST_SEEDS];

    for (const seed of allSeeds) {
      const vector = textToVector(seed.text);
      this.contentStore.store({
        id: seed.id,
        vector,
        metadata: {
          text: seed.text,
          sourceType: seed.sourceType,
          dial: seed.dial,
          topic: seed.topic,
        },
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
    // Try Pi-Brain first (persistent, HNSW-indexed), fall back to in-memory
    if (this.piBrain.isConnected) {
      return this.getRAGContextFromPiBrain(userId, userMessage);
    }
    return this.getRAGContextFromMemory(userId, userMessage);
  }

  private async getRAGContextFromPiBrain(
    userId: string,
    userMessage: string,
  ): Promise<RAGContext> {
    // 1. Search Keith's coaching content (shared namespace)
    const contentResult = await this.piBrain.searchCoachingContent(
      userMessage,
      1500,
    );
    const keithContent = contentResult.workingSet
      ? [
          {
            id: 'pi-brain-rag',
            text: contentResult.workingSet,
            topic: 'Keith Yackey coaching content',
            score: 1.0,
          },
        ]
      : [];

    // 2. Search user's past conversations (USER-SCOPED namespace)
    const userContext = await this.piBrain.recallUserContext(
      userId,
      userMessage,
      800,
    );
    const pastConversations = userContext
      ? [{ id: 'pi-brain-user-context', summary: userContext, score: 1.0 }]
      : [];

    // 3. Learning notes from feedback history
    const learningNotes = this.getLearningNotes(userId);

    this.logger.debug(
      `Pi-Brain RAG: ${keithContent.length} content entries, ${pastConversations.length} user entries`,
    );

    return { keithContent, pastConversations, learningNotes };
  }

  private getRAGContextFromMemory(
    userId: string,
    userMessage: string,
  ): RAGContext {
    const queryVector = textToVector(userMessage);

    // 1. Search Keith's coaching content (shared)
    const contentResults = this.contentStore.search(queryVector, 3);
    const keithContent = contentResults
      .filter((r) => r.score > 0.05)
      .map((r) => ({
        id: r.id,
        text: r.metadata.text as string,
        topic: r.metadata.topic as string,
        score: r.score,
      }));

    // 2. Search past conversations (USER-SCOPED — prefix filter)
    const userPrefix = `user:${userId}:`;
    const convResults = this.conversationStore.search(queryVector, 3, userPrefix);
    const pastConversations = convResults
      .filter((r) => r.score > 0.1)
      .map((r) => ({
        id: r.id,
        summary: r.metadata.summary as string,
        score: r.score,
      }));

    // 3. Learning notes
    const learningNotes = this.getLearningNotes(userId);

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
    // Store in Pi-Brain (persistent) if available
    if (this.piBrain.isConnected) {
      // Fire and forget — don't block the response
      this.piBrain
        .storeConversation(
          data.userId,
          data.conversationId,
          data.summary,
          '',
          data.mode,
        )
        .catch((e) =>
          this.logger.error(`Pi-Brain store failed: ${e.message}`),
        );
    }

    // Always store in memory too (for immediate recall within same session)
    const id = `user:${data.userId}:conv:${data.conversationId}`;
    const vector = textToVector(data.summary);
    this.conversationStore.store({
      id,
      vector,
      metadata: {
        conversationId: data.conversationId,
        userId: data.userId,
        summary: data.summary,
        mode: data.mode,
        messageCount: data.messageCount,
        timestamp: data.timestamp,
      },
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
    this.conversationStore.delete(id);
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
    // Persist to Pi-Brain if available
    if (this.piBrain.isConnected) {
      this.piBrain
        .recordFeedback(
          data.userId,
          data.conversationId,
          data.messageId,
          data.score,
          data.responseText,
          data.mode,
        )
        .catch((e) =>
          this.logger.error(`Pi-Brain feedback failed: ${e.message}`),
        );
    }

    // Also store in memory
    const id = `user:${data.userId}:fb:${data.messageId}`;
    const vector = textToVector(data.responseText);

    this.feedbackStore.store({
      id,
      vector,
      metadata: {
        messageId: data.messageId,
        conversationId: data.conversationId,
        userId: data.userId,
        score: data.score,
        mode: data.mode,
        responseSnippet: data.responseText.substring(0, 200),
        timestamp: data.timestamp,
      },
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

    // Search for highly-rated past responses to understand preferences
    const userPrefix = `user:${userId}:fb:`;
    const allFeedback = this.feedbackStore.getByPrefix(userPrefix);
    const positiveFeedback = allFeedback.filter(
      (f) => (f.metadata.score as number) >= 4,
    );
    const negativeFeedback = allFeedback.filter(
      (f) => (f.metadata.score as number) <= 2,
    );

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

  getMetrics() {
    return {
      contentEntries: this.contentStore.count(),
      conversationEntries: this.conversationStore.count(),
      feedbackEntries: this.feedbackStore.count(),
      usersWithFeedback: this.userFeedbackStats.size,
    };
  }

  /** Get metrics scoped to a specific user. */
  getUserMetrics(userId: string) {
    const prefix = `user:${userId}:`;
    return {
      conversations: this.conversationStore.count(prefix + 'conv:'),
      feedbackSignals: this.feedbackStore.count(prefix + 'fb:'),
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
