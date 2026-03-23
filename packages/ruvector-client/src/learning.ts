/**
 * LearningEngine - Wraps SONA self-learning capabilities for Coach Keith AI.
 *
 * The SONA engine (Self-Optimizing Neural Architecture) provides:
 *  - Micro-LoRA: ultra-fast rank-1/2 weight adaptations (~0.1 ms)
 *  - Base-LoRA: deeper adaptations for complex patterns
 *  - EWC++: prevents catastrophic forgetting across sessions
 *  - ReasoningBank: stores and retrieves learned patterns
 *  - Trajectory tracking: learns from complete conversation arcs
 *
 * This wrapper translates Coach Keith domain events (user feedback,
 * conversation outcomes, engagement signals) into SONA trajectories and
 * learning signals so the system gets measurably better with every
 * conversation.
 */

import type { RuvectorClient } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LearningSignal {
  /** Unique identifier for this signal. */
  id: string;
  /** The user who generated the signal. */
  userId: string;
  /** Category of signal (feedback, outcome, engagement, correction). */
  kind: LearningSignalKind;
  /** Numeric quality/reward score in [0, 1]. */
  quality: number;
  /** Embedding of the context that produced this signal. */
  contextEmbedding: number[];
  /** Free-form payload (dial adjustments, text feedback, etc.). */
  payload: Record<string, unknown>;
  /** ISO timestamp. */
  timestamp: string;
}

export type LearningSignalKind =
  | 'user_feedback'
  | 'conversation_outcome'
  | 'engagement_metric'
  | 'correction';

export interface LearningMetrics {
  /** Total trajectories recorded since engine start. */
  trajectoriesRecorded: number;
  /** Patterns stored in the ReasoningBank. */
  patternsLearned: number;
  /** Micro-LoRA weight updates applied. */
  microLoraUpdates: number;
  /** Base-LoRA weight updates applied. */
  baseLoraUpdates: number;
  /** EWC consolidation passes. */
  ewcConsolidations: number;
  /** Mean learning cycle time in milliseconds. */
  avgLearningTimeMs: number;
  /** Whether SONA is actively running. */
  sonaEnabled: boolean;
  /** Total learning signals processed by this engine instance. */
  signalsProcessed: number;
}

export interface OptimizedSearchParams {
  /** Adjusted query embedding (micro-LoRA transformed). */
  transformedQuery: number[];
  /** Suggested k value based on learned patterns. */
  suggestedK: number;
  /** Suggested efSearch (HNSW beam width). */
  suggestedEfSearch: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class LearningEngine {
  private readonly client: RuvectorClient;
  private activeTrajectories = new Map<string, number>();
  private signalsProcessed = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor(client: RuvectorClient) {
    this.client = client;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Start the background learning tick.  This calls `sona.tick()` on a
   * regular interval so that SONA can consolidate weight updates in the
   * background without blocking the main thread.
   *
   * @param intervalMs  How often to tick (default 5 000 ms).
   */
  startBackgroundLearning(intervalMs = 5_000): void {
    if (this.tickInterval) return;
    if (!this.client.sonaAvailable) return;

    this.tickInterval = setInterval(() => {
      this.client.sona?.tick();
    }, intervalMs);

    // Allow the process to exit even if the interval is still running.
    if (this.tickInterval && typeof this.tickInterval === 'object' && 'unref' in this.tickInterval) {
      (this.tickInterval as NodeJS.Timeout).unref();
    }
  }

  /** Stop the background tick. */
  stopBackgroundLearning(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  // -----------------------------------------------------------------------
  // Signal processing
  // -----------------------------------------------------------------------

  /**
   * Feed a learning signal into the SONA engine.
   *
   * Each signal starts a trajectory (begin -> step -> end) so SONA can
   * learn from the context embedding + quality score.
   */
  async processLearningSignal(signal: LearningSignal): Promise<void> {
    // Persist the raw signal in the learning_signals collection.
    await this.client.store('learning_signals', {
      id: signal.id,
      vector: new Float32Array(signal.contextEmbedding),
    });

    // If SONA is available, record a single-step trajectory.
    const sona = this.client.sona;
    if (sona) {
      const trajId = sona.beginTrajectory(signal.contextEmbedding);

      // Use the context embedding as both activations and attention weights
      // (the Coach Keith domain does not produce separate attention tensors).
      sona.addStep(
        trajId,
        signal.contextEmbedding,
        signal.contextEmbedding,
        signal.quality,
      );
      sona.addContext(trajId, `${signal.kind}:${signal.userId}`);
      sona.endTrajectory(trajId, signal.quality);
    }

    this.signalsProcessed++;
  }

  /**
   * Begin tracking a multi-step conversation trajectory.
   *
   * Call `addTrajectoryStep` for each exchange, then `endTrajectory` when
   * the conversation finishes.
   *
   * @returns A trajectory handle (string key) to pass to subsequent calls.
   */
  beginConversationTrajectory(
    conversationId: string,
    initialEmbedding: number[],
  ): string {
    const sona = this.client.sona;
    if (!sona) return conversationId;

    const trajId = sona.beginTrajectory(initialEmbedding);
    this.activeTrajectories.set(conversationId, trajId);
    return conversationId;
  }

  /** Record a step within an active conversation trajectory. */
  addTrajectoryStep(
    conversationId: string,
    stepEmbedding: number[],
    stepReward: number,
  ): void {
    const sona = this.client.sona;
    const trajId = this.activeTrajectories.get(conversationId);
    if (!sona || trajId === undefined) return;

    sona.addStep(trajId, stepEmbedding, stepEmbedding, stepReward);
  }

  /** Finalize a conversation trajectory with an overall quality score. */
  endConversationTrajectory(
    conversationId: string,
    quality: number,
  ): void {
    const sona = this.client.sona;
    const trajId = this.activeTrajectories.get(conversationId);
    if (!sona || trajId === undefined) return;

    sona.endTrajectory(trajId, quality);
    this.activeTrajectories.delete(conversationId);
    this.signalsProcessed++;
  }

  // -----------------------------------------------------------------------
  // Optimized retrieval
  // -----------------------------------------------------------------------

  /**
   * Transform a raw query embedding through micro-LoRA so searches
   * benefit from everything the engine has learned so far.
   *
   * When SONA is not available this returns the unmodified query with
   * sensible default search parameters.
   */
  getOptimizedSearchParams(queryEmbedding: number[]): OptimizedSearchParams {
    const sona = this.client.sona;

    if (!sona) {
      return {
        transformedQuery: queryEmbedding,
        suggestedK: 10,
        suggestedEfSearch: 200,
      };
    }

    // Apply learned micro-LoRA transformation.
    const transformedQuery = sona.applyMicroLora(queryEmbedding);

    // Probe the ReasoningBank: if many patterns match the query, we can
    // be more selective (lower k).  If few match, widen the search.
    const patterns = sona.findPatterns(queryEmbedding, 5);
    const patternCount = patterns.length;

    const suggestedK = patternCount >= 4 ? 5 : patternCount >= 2 ? 10 : 20;
    const suggestedEfSearch = patternCount >= 4 ? 100 : 200;

    return { transformedQuery, suggestedK, suggestedEfSearch };
  }

  // -----------------------------------------------------------------------
  // Metrics
  // -----------------------------------------------------------------------

  /** Get a snapshot of how the learning engine is performing. */
  getLearningMetrics(): LearningMetrics {
    const sona = this.client.sona;

    if (!sona) {
      return {
        trajectoriesRecorded: 0,
        patternsLearned: 0,
        microLoraUpdates: 0,
        baseLoraUpdates: 0,
        ewcConsolidations: 0,
        avgLearningTimeMs: 0,
        sonaEnabled: false,
        signalsProcessed: this.signalsProcessed,
      };
    }

    const stats = sona.getStats();

    return {
      trajectoriesRecorded: (stats as Record<string, number>).trajectoriesRecorded ?? 0,
      patternsLearned: (stats as Record<string, number>).patternsLearned ?? 0,
      microLoraUpdates: (stats as Record<string, number>).microLoraUpdates ?? 0,
      baseLoraUpdates: (stats as Record<string, number>).baseLoraUpdates ?? 0,
      ewcConsolidations: (stats as Record<string, number>).ewcConsolidations ?? 0,
      avgLearningTimeMs: (stats as Record<string, number>).avgLearningTimeMs ?? 0,
      sonaEnabled: sona.isEnabled(),
      signalsProcessed: this.signalsProcessed,
    };
  }

  /** Force SONA to run a learning cycle immediately. */
  forceLearn(): string | null {
    const sona = this.client.sona;
    if (!sona) return null;
    return sona.forceLearn();
  }
}
