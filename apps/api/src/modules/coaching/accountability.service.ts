import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DataStore } from '../learning/data-store.service';

export enum InterventionType {
  WARNING = 'warning',
  ESCALATION = 'escalation',
  CRITICAL = 'critical',
  CELEBRATION = 'celebration',
}

export interface Intervention {
  id: string;
  userId: string;
  type: InterventionType;
  message: string;
  dial?: string;
  createdAt: string;
  delivered: boolean;
}

interface AssessmentRecord {
  scores: Record<string, number>;
  timestamp: string;
}

interface UserActivity {
  lastLoginAt: string;
  lastAssessmentAt?: string;
}

@Injectable()
export class AccountabilityService {
  private readonly logger = new Logger(AccountabilityService.name);

  constructor(private readonly dataStore: DataStore) {}

  /**
   * Evaluate a user's assessment results against their 4-week history.
   * Generates WARNING (dial drop), CELEBRATION (dial surge), or
   * ESCALATION (lagging dial at zero) interventions.
   */
  async evaluateAfterAssessment(
    userId: string,
    currentScores: Record<string, number>,
  ): Promise<Intervention[]> {
    const interventions: Intervention[] = [];
    const history = this.getAssessmentHistory(userId);

    // Store the current assessment in history
    this.storeAssessment(userId, currentScores);

    if (history.length === 0) {
      return interventions;
    }

    // Compute 4-week averages per dial
    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const recentHistory = history.filter(
      (h) => new Date(h.timestamp).getTime() >= fourWeeksAgo,
    );

    if (recentHistory.length === 0) {
      return interventions;
    }

    const averages = this.computeAverages(recentHistory);

    // Check each dial
    for (const [dial, currentScore] of Object.entries(currentScores)) {
      const avg = averages[dial];
      if (avg === undefined) continue;

      const diff = currentScore - avg;

      // Dial dropped by 2+ from average
      if (diff <= -2) {
        interventions.push(
          this.createIntervention(
            userId,
            InterventionType.WARNING,
            `Brother, I see your ${dial} dropped from ${Math.round(avg)} to ${currentScore} this week. What happened? Talk to me.`,
            dial,
          ),
        );
      }

      // Dial surged by 2+ from average
      if (diff >= 2) {
        interventions.push(
          this.createIntervention(
            userId,
            InterventionType.CELEBRATION,
            `I see you crushed the ${dial} this week — ${currentScore} up from ${Math.round(avg)}. That's what I'm talking about. Keep that energy.`,
            dial,
          ),
        );
      }
    }

    // Check for lagging dials at 0 for 2+ weeks
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const lastTwoWeeks = history.filter(
      (h) => new Date(h.timestamp).getTime() >= twoWeeksAgo,
    );

    if (lastTwoWeeks.length >= 2) {
      for (const dial of Object.keys(currentScores)) {
        const allZero = lastTwoWeeks.every(
          (h) => (h.scores[dial] ?? 0) === 0,
        );
        if (allZero && (currentScores[dial] ?? 0) === 0) {
          interventions.push(
            this.createIntervention(
              userId,
              InterventionType.WARNING,
              `Your ${dial} has been sitting at zero for over two weeks now. That's not a plateau — that's a problem. What's blocking you?`,
              dial,
            ),
          );
        }
      }
    }

    // Persist interventions
    for (const intervention of interventions) {
      this.storeIntervention(userId, intervention);
    }

    this.logger.log(
      `Evaluated assessment for user ${userId}: ${interventions.length} interventions generated`,
    );

    return interventions;
  }

  /**
   * Evaluate on login: check for inactivity and missed assessments.
   * Returns any pending (undelivered) interventions.
   */
  async evaluateOnLogin(userId: string): Promise<Intervention[]> {
    const activity = this.dataStore.get<UserActivity>(
      'user-activity',
      userId,
    );

    const now = new Date();
    const interventions: Intervention[] = [];

    if (activity?.lastLoginAt) {
      const lastLogin = new Date(activity.lastLoginAt);
      const daysSinceLogin = Math.floor(
        (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24),
      );

      // 7+ days inactive: CRITICAL
      if (daysSinceLogin >= 7) {
        interventions.push(
          this.createIntervention(
            userId,
            InterventionType.CRITICAL,
            `Where the hell have you been? ${daysSinceLogin} days without checking in. Your marriage doesn't take days off, and neither should you.`,
          ),
        );
      }
    }

    // Check for missed assessments (2+ weeks without one)
    const history = this.getAssessmentHistory(userId);
    if (history.length > 0) {
      const lastAssessment = history[history.length - 1];
      const daysSinceAssessment = Math.floor(
        (now.getTime() - new Date(lastAssessment.timestamp).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const weeksMissed = Math.floor(daysSinceAssessment / 7);

      if (weeksMissed >= 2) {
        interventions.push(
          this.createIntervention(
            userId,
            InterventionType.ESCALATION,
            `Hey — you haven't done your dials in ${weeksMissed} weeks. The dials don't move themselves. Get back in here.`,
          ),
        );
      }
    }

    // Persist any new interventions
    for (const intervention of interventions) {
      this.storeIntervention(userId, intervention);
    }

    // Update last login timestamp
    this.dataStore.set('user-activity', userId, {
      ...activity,
      lastLoginAt: now.toISOString(),
    });

    if (interventions.length > 0) {
      this.logger.log(
        `Login evaluation for user ${userId}: ${interventions.length} new interventions`,
      );
    }

    return interventions;
  }

  /**
   * Get all undelivered interventions for a user.
   */
  getUndeliveredMessages(userId: string): Intervention[] {
    const all = this.getAllInterventions(userId);
    return all.filter((i) => !i.delivered);
  }

  /**
   * Mark a specific intervention as delivered.
   */
  markDelivered(userId: string, interventionId: string): void {
    const all = this.getAllInterventions(userId);
    const intervention = all.find((i) => i.id === interventionId);
    if (intervention) {
      intervention.delivered = true;
      this.dataStore.set(`interventions:${userId}`, 'list', all);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getAssessmentHistory(userId: string): AssessmentRecord[] {
    return (
      this.dataStore.get<AssessmentRecord[]>(
        'assessment-history',
        userId,
      ) || []
    );
  }

  private storeAssessment(
    userId: string,
    scores: Record<string, number>,
  ): void {
    const history = this.getAssessmentHistory(userId);
    history.push({
      scores,
      timestamp: new Date().toISOString(),
    });
    // Keep last 12 weeks of history
    const trimmed = history.slice(-12);
    this.dataStore.set('assessment-history', userId, trimmed);
  }

  private computeAverages(
    records: AssessmentRecord[],
  ): Record<string, number> {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    for (const record of records) {
      for (const [dial, score] of Object.entries(record.scores)) {
        sums[dial] = (sums[dial] || 0) + score;
        counts[dial] = (counts[dial] || 0) + 1;
      }
    }

    const averages: Record<string, number> = {};
    for (const dial of Object.keys(sums)) {
      averages[dial] = sums[dial] / counts[dial];
    }
    return averages;
  }

  private createIntervention(
    userId: string,
    type: InterventionType,
    message: string,
    dial?: string,
  ): Intervention {
    return {
      id: uuidv4(),
      userId,
      type,
      message,
      dial,
      createdAt: new Date().toISOString(),
      delivered: false,
    };
  }

  private getAllInterventions(userId: string): Intervention[] {
    return (
      this.dataStore.get<Intervention[]>(
        `interventions:${userId}`,
        'list',
      ) || []
    );
  }

  private storeIntervention(
    userId: string,
    intervention: Intervention,
  ): void {
    const all = this.getAllInterventions(userId);
    all.push(intervention);
    // Keep last 100 interventions
    const trimmed = all.slice(-100);
    this.dataStore.set(`interventions:${userId}`, 'list', trimmed);
  }
}
