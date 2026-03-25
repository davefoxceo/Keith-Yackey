import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataStore } from '../learning/data-store.service';

interface StoredUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    mode: string;
    timestamp: Date;
    feedbackScore?: number;
  }>;
  fiveDialsContext?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

interface FiveDialsAssessment {
  id: string;
  userId: string;
  scores: Record<string, number>;
  healthScore: number;
  insights: string[];
  createdAt: Date;
}

interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  lastActiveDate: string;
}

interface Subscription {
  id: string;
  userId: string;
  tier: string;
  status: string;
  currentPeriodEnd: Date;
}

interface ClientSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  grade: string;
  gradeScore: number;
  beltLevel: string;
  leadingScore: number;
  laggingScore: number;
  lastActiveDate: string;
  streakDays: number;
}

interface GradeBreakdown {
  streakConsistency: number;
  avgLeadingScore: number;
  chatFrequency: number;
  assessmentCompletion: number;
  compositeScore: number;
  grade: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly dataStore: DataStore) {}

  async getOverview() {
    const users = this.dataStore.getAll<StoredUser>('users');
    const conversations = this.dataStore.getAll<Conversation>('conversations');

    const totalUsers = users.size;
    const totalConversations = conversations.size;

    // Compute average leading score across all users
    let totalLeadingScore = 0;
    let usersWithScores = 0;
    let usersAtRisk = 0;

    for (const [userId] of users) {
      const leadingScore = this.computeLeadingScore(userId);
      if (leadingScore > 0) {
        totalLeadingScore += leadingScore;
        usersWithScores++;
      }

      const gradeBreakdown = this.computeGradeBreakdown(userId);
      if (
        gradeBreakdown.grade === 'C' ||
        gradeBreakdown.grade === 'D' ||
        gradeBreakdown.grade === 'F'
      ) {
        usersAtRisk++;
      }
    }

    const avgLeadingScore =
      usersWithScores > 0
        ? Math.round((totalLeadingScore / usersWithScores) * 10) / 10
        : 0;

    // Count active subscriptions (simplified: count entries in subscriptions store)
    const subscriptions =
      this.dataStore.getAll<Subscription>('subscriptions');
    let activeSubscriptions = 0;
    for (const [, sub] of subscriptions) {
      if (sub.status === 'active') {
        activeSubscriptions++;
      }
    }

    return {
      totalUsers,
      totalConversations,
      averageLeadingScore: avgLeadingScore,
      usersAtRisk,
      activeSubscriptions,
    };
  }

  async getClients(page: number = 1, limit: number = 20) {
    const users = this.dataStore.getAll<StoredUser>('users');
    const clients: ClientSummary[] = [];

    for (const [userId, user] of users) {
      const gradeBreakdown = this.computeGradeBreakdown(userId);
      const streak = this.getStreakData(userId);
      const leadingScore = this.computeLeadingScore(userId);
      const laggingScore = this.computeLaggingScore(userId);

      clients.push({
        id: userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        grade: gradeBreakdown.grade,
        gradeScore: gradeBreakdown.compositeScore,
        beltLevel: this.computeBeltLevel(leadingScore, streak.currentStreak),
        leadingScore,
        laggingScore,
        lastActiveDate: streak.lastActiveDate || user.updatedAt || '',
        streakDays: streak.currentStreak,
      });
    }

    // Sort by grade score descending
    clients.sort((a, b) => b.gradeScore - a.gradeScore);

    const total = clients.length;
    const offset = (page - 1) * limit;
    const items = clients.slice(offset, offset + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getClientDetail(clientId: string) {
    const user = this.dataStore.get<StoredUser>('users', clientId);
    if (!user) {
      throw new NotFoundException('Client not found');
    }

    const gradeBreakdown = this.computeGradeBreakdown(clientId);
    const streak = this.getStreakData(clientId);
    const leadingScore = this.computeLeadingScore(clientId);
    const laggingScore = this.computeLaggingScore(clientId);

    // Assessment history
    const assessments =
      this.dataStore.get<FiveDialsAssessment[]>('assessments', clientId) || [];

    // Conversations
    const allConversations =
      this.dataStore.getAll<Conversation>('conversations');
    const userConversations = Array.from(allConversations.values())
      .filter((c) => c.userId === clientId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .map((c) => ({
        id: c.id,
        title: c.title,
        mode: c.mode,
        messageCount: c.messages.filter((m) => m.role !== 'system').length,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

    // Last 5 interventions (conversations in accountability or crisis mode)
    const interventions = Array.from(allConversations.values())
      .filter(
        (c) =>
          c.userId === clientId &&
          (c.mode === 'accountability' || c.mode === 'crisis'),
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        title: c.title,
        mode: c.mode,
        messageCount: c.messages.filter((m) => m.role !== 'system').length,
        createdAt: c.createdAt,
      }));

    // Current scores from latest assessment
    const latestAssessment =
      assessments.length > 0 ? assessments[assessments.length - 1] : null;

    return {
      profile: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt,
      },
      scores: latestAssessment
        ? {
            fiveDials: latestAssessment.scores,
            healthScore: latestAssessment.healthScore,
            assessedAt: latestAssessment.createdAt,
          }
        : null,
      leadingScore,
      laggingScore,
      streak: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        totalDaysActive: streak.totalDaysActive,
        lastActiveDate: streak.lastActiveDate,
      },
      gradeBreakdown,
      beltLevel: this.computeBeltLevel(leadingScore, streak.currentStreak),
      assessmentHistory: assessments.map((a) => ({
        id: a.id,
        scores: a.scores,
        healthScore: a.healthScore,
        createdAt: a.createdAt,
      })),
      conversations: userConversations,
      interventions,
    };
  }

  /**
   * Grade algorithm:
   * streak_consistency (25%) + avg_leading_score (35%) + chat_frequency (20%) + assessment_completion (20%)
   * A = 90-100, B = 75-89, C = 60-74, D = 40-59, F = below 40
   */
  private computeGradeBreakdown(userId: string): GradeBreakdown {
    const streak = this.getStreakData(userId);
    const allConversations =
      this.dataStore.getAll<Conversation>('conversations');
    const assessments =
      this.dataStore.get<FiveDialsAssessment[]>('assessments', userId) || [];

    // Streak consistency: scale current streak to 0-100 (30-day streak = 100)
    const streakConsistency = Math.min(
      100,
      Math.round((streak.currentStreak / 30) * 100),
    );

    // Average leading score: based on latest assessment health score (already 0-100)
    const latestAssessment =
      assessments.length > 0 ? assessments[assessments.length - 1] : null;
    const avgLeadingScore = latestAssessment
      ? latestAssessment.healthScore
      : 0;

    // Chat frequency: scale conversation count to 0-100 (10 conversations in last 30 days = 100)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentConvCount = Array.from(allConversations.values()).filter(
      (c) =>
        c.userId === userId && new Date(c.createdAt) > thirtyDaysAgo,
    ).length;
    const chatFrequency = Math.min(
      100,
      Math.round((recentConvCount / 10) * 100),
    );

    // Assessment completion: have they taken an assessment recently? (last 30 days = 100)
    const recentAssessments = assessments.filter(
      (a) => new Date(a.createdAt) > thirtyDaysAgo,
    );
    const assessmentCompletion = recentAssessments.length > 0 ? 100 : 0;

    const compositeScore = Math.round(
      streakConsistency * 0.25 +
        avgLeadingScore * 0.35 +
        chatFrequency * 0.2 +
        assessmentCompletion * 0.2,
    );

    let grade: string;
    if (compositeScore >= 90) grade = 'A';
    else if (compositeScore >= 75) grade = 'B';
    else if (compositeScore >= 60) grade = 'C';
    else if (compositeScore >= 40) grade = 'D';
    else grade = 'F';

    return {
      streakConsistency,
      avgLeadingScore,
      chatFrequency,
      assessmentCompletion,
      compositeScore,
      grade,
    };
  }

  private getStreakData(userId: string): StreakData {
    const streak = this.dataStore.get<StreakData>('streaks', userId);
    return (
      streak || {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalDaysActive: 0,
        lastActiveDate: '',
      }
    );
  }

  /**
   * Leading score: proactive engagement metrics (assessments, conversations started, streaks).
   * Scale 0-100.
   */
  private computeLeadingScore(userId: string): number {
    const streak = this.getStreakData(userId);
    const assessments =
      this.dataStore.get<FiveDialsAssessment[]>('assessments', userId) || [];
    const allConversations =
      this.dataStore.getAll<Conversation>('conversations');

    const userConvCount = Array.from(allConversations.values()).filter(
      (c) => c.userId === userId,
    ).length;

    // Leading: streak contribution (40%) + conversations (30%) + assessments (30%)
    const streakPart = Math.min(100, (streak.currentStreak / 30) * 100);
    const convPart = Math.min(100, (userConvCount / 10) * 100);
    const assessPart = Math.min(100, (assessments.length / 3) * 100);

    return Math.round(streakPart * 0.4 + convPart * 0.3 + assessPart * 0.3);
  }

  /**
   * Lagging score: outcome metrics (Five Dials improvement, health score).
   * Scale 0-100.
   */
  private computeLaggingScore(userId: string): number {
    const assessments =
      this.dataStore.get<FiveDialsAssessment[]>('assessments', userId) || [];
    if (assessments.length === 0) return 0;

    const latest = assessments[assessments.length - 1];
    return latest.healthScore;
  }

  /**
   * Belt levels based on overall engagement and scores.
   */
  private computeBeltLevel(
    leadingScore: number,
    currentStreak: number,
  ): string {
    if (leadingScore >= 90 && currentStreak >= 90) return 'Black';
    if (leadingScore >= 75 && currentStreak >= 60) return 'Brown';
    if (leadingScore >= 60 && currentStreak >= 30) return 'Blue';
    if (leadingScore >= 40 && currentStreak >= 14) return 'Green';
    if (leadingScore >= 20 && currentStreak >= 7) return 'Yellow';
    return 'White';
  }
}
