import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface FiveDialsScores {
  self: number;
  marriage: number;
  family: number;
  faith: number;
  finances: number;
}

export interface FiveDialsAssessment {
  id: string;
  userId: string;
  scores: FiveDialsScores;
  responses: Record<string, number>;
  healthScore: number;
  insights: string[];
  createdAt: Date;
}

export interface MicroChallenge {
  id: string;
  userId: string;
  dial: keyof FiveDialsScores;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  pointValue: number;
  completed: boolean;
  completedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);
  private assessments: Map<string, FiveDialsAssessment[]> = new Map();
  private challenges: Map<string, MicroChallenge[]> = new Map();

  private readonly DIAL_QUESTIONS: Record<keyof FiveDialsScores, string[]> = {
    self: [
      'I take time daily for personal growth and self-reflection',
      'I manage my stress and emotions in healthy ways',
      'I am physically active and prioritize my health',
      'I have clear personal goals and am making progress toward them',
      'I handle conflict without losing my temper',
    ],
    marriage: [
      'My spouse and I communicate openly and honestly',
      'I prioritize quality time with my spouse weekly',
      'I actively listen to my spouse without becoming defensive',
      'We are aligned on major life decisions',
      'I express appreciation and affection regularly',
    ],
    family: [
      'I am present and engaged during family time',
      'I model the values I want my children to learn',
      'I make individual time for each of my children',
      'Our family has consistent routines and traditions',
      'I co-parent effectively with my spouse',
    ],
    faith: [
      'I have a consistent spiritual practice or devotional life',
      'My faith guides my daily decisions and relationships',
      'I am part of a spiritual community or accountability group',
      'I practice forgiveness and grace in my relationships',
      'I find meaning and purpose beyond material success',
    ],
    finances: [
      'My spouse and I are aligned on financial goals',
      'I have a budget and stick to it consistently',
      'I am actively paying down debt or building savings',
      'Financial stress does not dominate our household',
      'I am generous and give intentionally',
    ],
  };

  private readonly CHALLENGE_TEMPLATES: Record<
    keyof FiveDialsScores,
    Array<{ title: string; description: string; difficulty: MicroChallenge['difficulty'] }>
  > = {
    self: [
      { title: '5-Minute Morning Meditation', description: 'Start your day with 5 minutes of quiet reflection before checking your phone.', difficulty: 'easy' },
      { title: 'Journal Your Triggers', description: 'Write down 3 moments today where you felt reactive and what triggered them.', difficulty: 'medium' },
      { title: 'Cold Shower Challenge', description: 'End your shower with 60 seconds of cold water. Build mental toughness.', difficulty: 'hard' },
    ],
    marriage: [
      { title: 'Send an Appreciation Text', description: 'Text your wife 3 specific things you appreciate about her today.', difficulty: 'easy' },
      { title: '15-Minute Connection Talk', description: 'Have a 15-minute conversation with your spouse — no phones, no TV, no kids.', difficulty: 'medium' },
      { title: 'Plan a Surprise Date', description: 'Plan and execute a surprise date for your spouse this week.', difficulty: 'hard' },
    ],
    family: [
      { title: 'Family Dinner: No Devices', description: 'Have a family dinner with all devices put away. Ask each person about their day.', difficulty: 'easy' },
      { title: 'One-on-One with a Child', description: 'Spend 30 minutes of focused one-on-one time with one of your children.', difficulty: 'medium' },
      { title: 'Create a Family Tradition', description: 'Establish a new weekly or monthly family tradition and do it this week.', difficulty: 'hard' },
    ],
    faith: [
      { title: 'Gratitude List', description: 'Write down 10 things you are grateful for today.', difficulty: 'easy' },
      { title: 'Serve Someone Anonymously', description: 'Do something kind for someone without expecting recognition.', difficulty: 'medium' },
      { title: 'Forgiveness Letter', description: 'Write a letter of forgiveness to someone who has wronged you (you do not have to send it).', difficulty: 'hard' },
    ],
    finances: [
      { title: 'Track Every Dollar Today', description: 'Record every purchase you make today, no matter how small.', difficulty: 'easy' },
      { title: 'Financial Check-In', description: 'Have a 20-minute financial check-in with your spouse. Review budget and goals.', difficulty: 'medium' },
      { title: 'Cancel 3 Subscriptions', description: 'Review all subscriptions and cancel at least 3 you do not truly need.', difficulty: 'hard' },
    ],
  };

  async submitFiveDials(
    userId: string,
    data: { responses: Record<string, number> },
  ) {
    // Validate response keys and values
    const validKeys = Object.keys(this.DIAL_QUESTIONS).flatMap((dial) =>
      this.DIAL_QUESTIONS[dial as keyof FiveDialsScores].map(
        (_, i) => `${dial}_${i}`,
      ),
    );

    for (const [key, value] of Object.entries(data.responses)) {
      if (!validKeys.includes(key)) {
        throw new BadRequestException(`Invalid response key: ${key}`);
      }
      if (typeof value !== 'number' || value < 1 || value > 10) {
        throw new BadRequestException(
          `Response value must be between 1 and 10 for key: ${key}`,
        );
      }
    }

    // Calculate scores per dial (average of responses)
    const scores: FiveDialsScores = {
      self: 0,
      marriage: 0,
      family: 0,
      faith: 0,
      finances: 0,
    };

    for (const dial of Object.keys(scores) as Array<keyof FiveDialsScores>) {
      const dialResponses = Object.entries(data.responses)
        .filter(([key]) => key.startsWith(`${dial}_`))
        .map(([, value]) => value);

      if (dialResponses.length > 0) {
        scores[dial] = Math.round(
          (dialResponses.reduce((a, b) => a + b, 0) / dialResponses.length) *
            10,
        ) / 10;
      }
    }

    const healthScore = this.computeHealthScore(scores);
    const insights = this.generateInsights(scores, userId);

    const assessment: FiveDialsAssessment = {
      id: uuidv4(),
      userId,
      scores,
      responses: data.responses,
      healthScore,
      insights,
      createdAt: new Date(),
    };

    // Store assessment
    const userAssessments = this.assessments.get(userId) || [];
    userAssessments.push(assessment);
    this.assessments.set(userId, userAssessments);

    // Generate new challenges based on lowest scoring dials
    await this.generateChallenges(userId, scores);

    this.logger.log(
      `Five Dials assessment submitted for user ${userId}: health score = ${healthScore}`,
    );

    return {
      id: assessment.id,
      scores,
      healthScore,
      insights,
      trends: this.computeTrends(userId),
      createdAt: assessment.createdAt,
    };
  }

  async getAssessmentHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const userAssessments = (this.assessments.get(userId) || []).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const total = userAssessments.length;
    const offset = (page - 1) * limit;
    const items = userAssessments.slice(offset, offset + limit).map((a) => ({
      id: a.id,
      scores: a.scores,
      healthScore: a.healthScore,
      createdAt: a.createdAt,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCurrentScores(userId: string) {
    const userAssessments = this.assessments.get(userId);
    if (!userAssessments || userAssessments.length === 0) {
      return {
        hasAssessment: false,
        scores: null,
        healthScore: null,
        trends: null,
        message: 'No assessment taken yet. Complete your first Five Dials assessment to get started.',
      };
    }

    const latest = userAssessments[userAssessments.length - 1];
    return {
      hasAssessment: true,
      scores: latest.scores,
      healthScore: latest.healthScore,
      insights: latest.insights,
      trends: this.computeTrends(userId),
      lastAssessedAt: latest.createdAt,
    };
  }

  async getHealthScore(userId: string) {
    const userAssessments = this.assessments.get(userId);
    if (!userAssessments || userAssessments.length === 0) {
      throw new NotFoundException('No assessments found. Please complete a Five Dials assessment first.');
    }

    const latest = userAssessments[userAssessments.length - 1];
    const trends = this.computeTrends(userId);

    let category: string;
    if (latest.healthScore >= 80) category = 'thriving';
    else if (latest.healthScore >= 60) category = 'growing';
    else if (latest.healthScore >= 40) category = 'struggling';
    else category = 'crisis';

    return {
      healthScore: latest.healthScore,
      category,
      scores: latest.scores,
      trends,
      recommendations: this.getRecommendations(latest.scores, category),
      assessedAt: latest.createdAt,
    };
  }

  async getActiveChallenges(userId: string) {
    const userChallenges = (this.challenges.get(userId) || []).filter(
      (c) => !c.completed && c.expiresAt > new Date(),
    );

    return {
      active: userChallenges.map((c) => ({
        id: c.id,
        dial: c.dial,
        title: c.title,
        description: c.description,
        difficulty: c.difficulty,
        pointValue: c.pointValue,
        expiresAt: c.expiresAt,
      })),
      completedToday: (this.challenges.get(userId) || []).filter(
        (c) =>
          c.completed &&
          c.completedAt &&
          this.isToday(c.completedAt),
      ).length,
    };
  }

  async completeChallenge(userId: string, challengeId: string) {
    const userChallenges = this.challenges.get(userId) || [];
    const challenge = userChallenges.find((c) => c.id === challengeId);

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }
    if (challenge.completed) {
      throw new BadRequestException('Challenge already completed');
    }
    if (challenge.expiresAt < new Date()) {
      throw new BadRequestException('Challenge has expired');
    }

    challenge.completed = true;
    challenge.completedAt = new Date();

    const totalCompleted = userChallenges.filter((c) => c.completed).length;

    this.logger.log(
      `Challenge completed: ${challenge.title} by user ${userId} (total: ${totalCompleted})`,
    );

    return {
      challengeId,
      pointsEarned: challenge.pointValue,
      dial: challenge.dial,
      totalCompleted,
      message: `Great work completing "${challenge.title}"! You earned ${challenge.pointValue} points.`,
    };
  }

  private computeHealthScore(scores: FiveDialsScores): number {
    // Weighted health score: marriage is weighted higher as it's the primary focus
    const weights = {
      self: 0.15,
      marriage: 0.35,
      family: 0.20,
      faith: 0.15,
      finances: 0.15,
    };

    let weightedSum = 0;
    for (const [dial, weight] of Object.entries(weights)) {
      weightedSum += scores[dial as keyof FiveDialsScores] * weight;
    }

    // Scale to 0-100
    return Math.round(weightedSum * 10);
  }

  private computeTrends(userId: string) {
    const userAssessments = this.assessments.get(userId) || [];
    if (userAssessments.length < 2) {
      return null;
    }

    const latest = userAssessments[userAssessments.length - 1];
    const previous = userAssessments[userAssessments.length - 2];

    const trends: Record<string, { current: number; previous: number; change: number; direction: string }> = {};
    for (const dial of Object.keys(latest.scores) as Array<keyof FiveDialsScores>) {
      const change = Math.round((latest.scores[dial] - previous.scores[dial]) * 10) / 10;
      trends[dial] = {
        current: latest.scores[dial],
        previous: previous.scores[dial],
        change,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      };
    }

    return {
      dialTrends: trends,
      healthScoreChange: latest.healthScore - previous.healthScore,
      assessmentCount: userAssessments.length,
      periodDays: Math.round(
        (latest.createdAt.getTime() - previous.createdAt.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    };
  }

  private generateInsights(scores: FiveDialsScores, userId: string): string[] {
    const insights: string[] = [];
    const sortedDials = (
      Object.entries(scores) as [keyof FiveDialsScores, number][]
    ).sort((a, b) => a[1] - b[1]);

    const lowestDial = sortedDials[0];
    const highestDial = sortedDials[sortedDials.length - 1];

    insights.push(
      `Your strongest area is ${highestDial[0]} at ${highestDial[1]}/10 — keep building on that momentum.`,
    );

    if (lowestDial[1] < 5) {
      insights.push(
        `Your ${lowestDial[0]} dial needs attention at ${lowestDial[1]}/10. Small daily actions in this area will compound.`,
      );
    }

    // Check for imbalance
    const spread = highestDial[1] - lowestDial[1];
    if (spread > 4) {
      insights.push(
        `There is a ${spread}-point gap between your highest and lowest dials. Balance across all Five Dials leads to sustainable growth.`,
      );
    }

    // Marriage-specific insight
    if (scores.marriage < 6) {
      insights.push(
        'Your marriage dial is below 6 — consider switching to Coach mode for a focused conversation about communication patterns.',
      );
    }

    // Self-care check
    if (scores.self < scores.marriage) {
      insights.push(
        'Remember: you cannot pour from an empty cup. Your Self dial is lower than your Marriage dial — invest in yourself to be a better partner.',
      );
    }

    return insights;
  }

  private getRecommendations(scores: FiveDialsScores, category: string): string[] {
    const recs: string[] = [];

    if (category === 'crisis') {
      recs.push('Start a Crisis Mode conversation with Coach Keith for immediate support.');
      recs.push('Focus on one small win in your lowest-scoring dial today.');
    } else if (category === 'struggling') {
      recs.push('Complete the daily micro-challenges to build momentum.');
      recs.push('Listen to the recommended podcast episodes for your lowest dial.');
    } else if (category === 'growing') {
      recs.push('Challenge yourself with an Accountability session to push through your current plateau.');
      recs.push('Consider joining the Brotherhood community for peer support.');
    } else {
      recs.push('Share your journey in the Brotherhood feed to inspire others.');
      recs.push('Mentor another man — teaching solidifies your own growth.');
    }

    return recs;
  }

  private async generateChallenges(userId: string, scores: FiveDialsScores) {
    // Find the two lowest-scoring dials
    const sortedDials = (
      Object.entries(scores) as [keyof FiveDialsScores, number][]
    ).sort((a, b) => a[1] - b[1]);

    const targetDials = sortedDials.slice(0, 2).map(([dial]) => dial);
    const newChallenges: MicroChallenge[] = [];

    for (const dial of targetDials) {
      const templates = this.CHALLENGE_TEMPLATES[dial];
      // Pick a challenge appropriate for the score
      const difficulty =
        scores[dial] < 4 ? 'easy' : scores[dial] < 7 ? 'medium' : 'hard';
      const template =
        templates.find((t) => t.difficulty === difficulty) || templates[0];

      newChallenges.push({
        id: uuidv4(),
        userId,
        dial,
        title: template.title,
        description: template.description,
        difficulty: template.difficulty,
        pointValue: template.difficulty === 'easy' ? 10 : template.difficulty === 'medium' ? 25 : 50,
        completed: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
      });
    }

    const existing = this.challenges.get(userId) || [];
    this.challenges.set(userId, [...existing, ...newChallenges]);
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }
}
