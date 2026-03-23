import type { Conversation } from '@coach-keith/shared/types/coaching';
import type { UserId } from '@coach-keith/shared/types/user';
import type { DialType } from '@coach-keith/shared/types/assessment';
import type { RuvectorClient } from '../rag/retriever';

/**
 * Feedback signals that can be collected from a coaching conversation.
 */
export interface ConversationFeedback {
  /** User's explicit rating of the conversation (1-5) */
  rating?: number;
  /** Whether the user found the advice actionable */
  actionable?: boolean;
  /** Whether the user reported the response as unhelpful or harmful */
  flagged?: boolean;
  /** Free-text feedback from the user */
  comment?: string;
  /** Whether the user completed the suggested action */
  actionCompleted?: boolean;
}

export interface DialChange {
  dial: DialType;
  previousScore: number;
  newScore: number;
  periodDays: number;
}

export interface RetrievalFeedback {
  /** Was the retrieved content used in the response? */
  wasUsed: boolean;
  /** User's implicit or explicit signal on relevance */
  relevanceSignal: 'positive' | 'negative' | 'neutral';
}

/**
 * A record of what was learned from a feedback event, suitable for
 * feeding back into Ruvector's SONA adaptive engine.
 */
export interface LearningSignal {
  type: 'conversation_outcome' | 'dial_improvement' | 'retrieval_weight';
  userId: UserId;
  timestamp: Date;
  data: Record<string, unknown>;
  sonaWeight: number;
}

/**
 * FeedbackProcessor — Processes coaching outcomes and feeds learning signals
 * back into Ruvector's SONA engine to make the AI smarter over time.
 *
 * The SONA (Self-Organizing Neural Adaptation) engine in Ruvector adjusts
 * vector weights and retrieval rankings based on real-world coaching outcomes.
 */
export class FeedbackProcessor {
  private readonly ruvectorClient: RuvectorClient;
  private readonly feedbackCollection: string;

  constructor(
    ruvectorClient: RuvectorClient,
    feedbackCollection: string = 'coach-keith-feedback',
  ) {
    this.ruvectorClient = ruvectorClient;
    this.feedbackCollection = feedbackCollection;
  }

  /**
   * Process the outcome of a completed conversation and generate learning signals.
   *
   * High-rated conversations reinforce the retrieval patterns used.
   * Low-rated or flagged conversations reduce weight on those patterns.
   */
  async processConversationOutcome(
    conversation: Conversation,
    feedback: ConversationFeedback,
  ): Promise<LearningSignal> {
    const signal: LearningSignal = {
      type: 'conversation_outcome',
      userId: conversation.userId,
      timestamp: new Date(),
      data: {
        conversationId: conversation.id,
        mode: conversation.mode,
        messageCount: conversation.messages.length,
        rating: feedback.rating,
        actionable: feedback.actionable,
        flagged: feedback.flagged,
        actionCompleted: feedback.actionCompleted,
      },
      sonaWeight: this.computeConversationWeight(feedback),
    };

    await this.submitLearningSignal(signal);
    return signal;
  }

  /**
   * Process dial score improvements and correlate them with coaching content.
   *
   * When a user's dial scores improve, we reinforce the advice and content
   * that was delivered during the improvement period.
   */
  async processDialImprovement(
    userId: UserId,
    dialChanges: DialChange[],
  ): Promise<LearningSignal[]> {
    const signals: LearningSignal[] = [];

    for (const change of dialChanges) {
      const improvement = change.newScore - change.previousScore;

      // Only generate positive signals for actual improvements
      if (improvement <= 0) continue;

      const signal: LearningSignal = {
        type: 'dial_improvement',
        userId,
        timestamp: new Date(),
        data: {
          dial: change.dial,
          previousScore: change.previousScore,
          newScore: change.newScore,
          improvement,
          periodDays: change.periodDays,
          // Larger improvements over shorter periods are stronger signals
          velocityScore: improvement / Math.max(change.periodDays, 1),
        },
        sonaWeight: this.computeDialWeight(improvement, change.periodDays),
      };

      signals.push(signal);
    }

    if (signals.length > 0) {
      await Promise.all(signals.map((s) => this.submitLearningSignal(s)));
    }

    return signals;
  }

  /**
   * Update retrieval weights based on which content chunks were actually useful.
   *
   * When a user gives positive feedback on a conversation, the content chunks
   * that were retrieved and used get a boost. Negative feedback reduces their weight.
   */
  async updateRetrievalWeights(
    query: string,
    selectedChunks: Array<{ id: string; contentType: string }>,
    feedback: RetrievalFeedback,
  ): Promise<LearningSignal> {
    const weightAdjustment =
      feedback.relevanceSignal === 'positive'
        ? 0.1
        : feedback.relevanceSignal === 'negative'
          ? -0.1
          : 0;

    const signal: LearningSignal = {
      type: 'retrieval_weight',
      userId: '' as UserId, // system-level signal
      timestamp: new Date(),
      data: {
        query,
        chunkIds: selectedChunks.map((c) => c.id),
        contentTypes: selectedChunks.map((c) => c.contentType),
        wasUsed: feedback.wasUsed,
        relevanceSignal: feedback.relevanceSignal,
        weightAdjustment,
      },
      sonaWeight: weightAdjustment,
    };

    await this.submitLearningSignal(signal);
    return signal;
  }

  /**
   * Compute a SONA weight from conversation feedback.
   * Positive weight reinforces, negative weight dampens.
   */
  private computeConversationWeight(feedback: ConversationFeedback): number {
    let weight = 0;

    // Rating contributes most (normalized from 1-5 to -1 to +1)
    if (feedback.rating !== undefined) {
      weight += (feedback.rating - 3) / 2;
    }

    // Actionability is a positive signal
    if (feedback.actionable) {
      weight += 0.2;
    }

    // Flagged is a strong negative signal
    if (feedback.flagged) {
      weight -= 0.5;
    }

    // Completed action is the strongest positive signal
    if (feedback.actionCompleted) {
      weight += 0.3;
    }

    // Clamp to [-1, 1]
    return Math.max(-1, Math.min(1, weight));
  }

  /**
   * Compute SONA weight from dial improvement.
   */
  private computeDialWeight(improvement: number, periodDays: number): number {
    // Normalize: a 2-point improvement in 7 days is very strong
    const velocity = improvement / Math.max(periodDays, 1);
    // Cap at 1.0
    return Math.min(1.0, velocity * 3.5);
  }

  /**
   * Submit a learning signal to Ruvector's feedback collection for SONA processing.
   */
  private async submitLearningSignal(signal: LearningSignal): Promise<void> {
    try {
      // Store the feedback signal in Ruvector for SONA to process
      // The SONA engine will read these signals and adjust vector weights
      await this.ruvectorClient.search({
        query: JSON.stringify(signal),
        collection: this.feedbackCollection,
        limit: 0, // We're not searching — this is a write-through pattern
        filters: {
          _action: 'ingest_feedback',
          _signal: signal,
        },
      });
    } catch (error) {
      // Feedback submission failure should not break the coaching flow
      console.error('[FeedbackProcessor] Failed to submit learning signal:', error);
    }
  }
}
