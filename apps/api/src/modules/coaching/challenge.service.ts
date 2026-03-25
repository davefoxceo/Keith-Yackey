import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { DataStore } from '../learning/data-store.service';

interface DailyAction {
  id: string;
  action: string;
  dial: string;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
  completedAt?: string;
}

interface DailyActionsRecord {
  userId: string;
  date: string;
  actions: DailyAction[];
  createdAt: string;
}

interface WeeklyChallengeRecord {
  userId: string;
  week: string;
  challenge: {
    id: string;
    action: string;
    dial: string;
    difficulty: 'easy' | 'medium' | 'hard';
    completed: boolean;
    completedAt?: string;
  };
  createdAt: string;
}

interface FiveDialsAssessment {
  id: string;
  userId: string;
  scores: Record<string, number>;
  healthScore: number;
  createdAt: Date;
}

interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: string;
  messages: Array<{ role: string; content: string }>;
  updatedAt: Date;
}

interface StreakData {
  currentStreak: number;
}

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);
  private anthropic: Anthropic;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataStore: DataStore,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async generateDailyActions(userId: string): Promise<DailyAction[]> {
    const today = this.todayString();
    const storeKey = `daily_actions:${userId}:${today}`;

    // Check if already generated today
    const existing = this.dataStore.get<DailyActionsRecord>(
      'daily_actions',
      storeKey,
    );
    if (existing) {
      return existing.actions;
    }

    // Gather user context
    const context = this.gatherUserContext(userId);

    const systemPrompt = `You are Coach Keith generating 3 daily micro-actions for this man. Each action must be completable in under 15 minutes, specific (not vague), and tied to his weakest dial. Format as JSON array with fields: action (string), dial (string), difficulty (easy/medium/hard).

Return ONLY the JSON array, no other text.`;

    const userPrompt = this.buildContextPrompt(context);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      const rawText = textBlock?.text || '[]';

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      const actions: DailyAction[] = parsed.slice(0, 3).map(
        (item: { action: string; dial: string; difficulty: string }) => ({
          id: uuidv4(),
          action: item.action || 'Reflect on your weakest area for 5 minutes',
          dial: item.dial || 'power',
          difficulty: (['easy', 'medium', 'hard'].includes(item.difficulty)
            ? item.difficulty
            : 'easy') as 'easy' | 'medium' | 'hard',
          completed: false,
        }),
      );

      // Ensure we always have 3 actions
      while (actions.length < 3) {
        actions.push({
          id: uuidv4(),
          action:
            'Spend 10 minutes journaling about one thing you want to improve',
          dial: context.weakestDial || 'power',
          difficulty: 'easy',
          completed: false,
        });
      }

      const record: DailyActionsRecord = {
        userId,
        date: today,
        actions,
        createdAt: new Date().toISOString(),
      };
      this.dataStore.set('daily_actions', storeKey, record);

      this.logger.log(
        `Generated 3 daily actions for user ${userId} on ${today}`,
      );
      return actions;
    } catch (error) {
      this.logger.error(
        `Failed to generate daily actions: ${error.message}`,
      );
      // Return fallback actions
      return this.getFallbackActions(context.weakestDial || 'power');
    }
  }

  async generateWeeklyChallenge(
    userId: string,
  ): Promise<WeeklyChallengeRecord['challenge']> {
    const week = this.currentWeekString();
    const storeKey = `weekly_challenge:${userId}:${week}`;

    // Check if already generated this week
    const existing = this.dataStore.get<WeeklyChallengeRecord>(
      'weekly_challenges',
      storeKey,
    );
    if (existing) {
      return existing.challenge;
    }

    const context = this.gatherUserContext(userId);

    const systemPrompt = `You are Coach Keith generating ONE weekly challenge for this man. The challenge should be focused on his lowest-scoring dial and take sustained effort over the week (not a single action). It should be meaningful and transformative.

Return ONLY a JSON object with fields: action (string), dial (string), difficulty (easy/medium/hard).`;

    const userPrompt = this.buildContextPrompt(context);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      const rawText = textBlock?.text || '{}';

      // Extract JSON from response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const challenge = {
        id: uuidv4(),
        action:
          parsed.action ||
          'Commit to one intentional conversation with your partner every day this week',
        dial: parsed.dial || context.weakestDial || 'partner',
        difficulty: (['easy', 'medium', 'hard'].includes(parsed.difficulty)
          ? parsed.difficulty
          : 'medium') as 'easy' | 'medium' | 'hard',
        completed: false,
      };

      const record: WeeklyChallengeRecord = {
        userId,
        week,
        challenge,
        createdAt: new Date().toISOString(),
      };
      this.dataStore.set('weekly_challenges', storeKey, record);

      this.logger.log(
        `Generated weekly challenge for user ${userId} for week ${week}`,
      );
      return challenge;
    } catch (error) {
      this.logger.error(
        `Failed to generate weekly challenge: ${error.message}`,
      );
      return {
        id: uuidv4(),
        action:
          'Have a meaningful 15-minute conversation with your partner every evening this week',
        dial: context.weakestDial || 'partner',
        difficulty: 'medium',
        completed: false,
      };
    }
  }

  async completeAction(
    userId: string,
    actionId: string,
  ): Promise<{ completedCount: number; totalCount: number }> {
    const today = this.todayString();
    const storeKey = `daily_actions:${userId}:${today}`;

    const record = this.dataStore.get<DailyActionsRecord>(
      'daily_actions',
      storeKey,
    );
    if (!record) {
      throw new NotFoundException('No daily actions found for today');
    }

    const action = record.actions.find((a) => a.id === actionId);
    if (!action) {
      throw new NotFoundException('Action not found');
    }

    action.completed = true;
    action.completedAt = new Date().toISOString();
    this.dataStore.set('daily_actions', storeKey, record);

    const completedCount = record.actions.filter((a) => a.completed).length;

    this.logger.log(
      `Action ${actionId} completed by user ${userId} (${completedCount}/${record.actions.length})`,
    );

    return {
      completedCount,
      totalCount: record.actions.length,
    };
  }

  async completeWeeklyChallenge(userId: string): Promise<{ completed: boolean }> {
    const week = this.currentWeekString();
    const storeKey = `weekly_challenge:${userId}:${week}`;

    const record = this.dataStore.get<WeeklyChallengeRecord>(
      'weekly_challenges',
      storeKey,
    );
    if (!record) {
      throw new NotFoundException('No weekly challenge found for this week');
    }

    record.challenge.completed = true;
    record.challenge.completedAt = new Date().toISOString();
    this.dataStore.set('weekly_challenges', storeKey, record);

    this.logger.log(`Weekly challenge completed by user ${userId} for week ${week}`);

    return { completed: true };
  }

  async getUserChallenges(userId: string) {
    const today = this.todayString();
    const week = this.currentWeekString();

    const dailyKey = `daily_actions:${userId}:${today}`;
    const weeklyKey = `weekly_challenge:${userId}:${week}`;

    // Generate if not yet generated today
    let dailyRecord = this.dataStore.get<DailyActionsRecord>(
      'daily_actions',
      dailyKey,
    );
    if (!dailyRecord) {
      const actions = await this.generateDailyActions(userId);
      dailyRecord = {
        userId,
        date: today,
        actions,
        createdAt: new Date().toISOString(),
      };
    }

    let weeklyRecord = this.dataStore.get<WeeklyChallengeRecord>(
      'weekly_challenges',
      weeklyKey,
    );
    if (!weeklyRecord) {
      const challenge = await this.generateWeeklyChallenge(userId);
      weeklyRecord = {
        userId,
        week,
        challenge,
        createdAt: new Date().toISOString(),
      };
    }

    return {
      dailyActions: dailyRecord.actions,
      dailyCompletedCount: dailyRecord.actions.filter((a) => a.completed)
        .length,
      weeklyChallenge: weeklyRecord.challenge,
      date: today,
      week,
    };
  }

  private gatherUserContext(userId: string): {
    fiveDialsScores: Record<string, number> | null;
    weakestDial: string | null;
    recentTopics: string[];
    beltLevel: string;
    streak: number;
  } {
    // Get latest Five Dials scores
    const assessments =
      this.dataStore.get<FiveDialsAssessment[]>('assessments', userId) || [];
    const latestAssessment =
      assessments.length > 0 ? assessments[assessments.length - 1] : null;
    const fiveDialsScores = latestAssessment?.scores || null;

    // Find weakest dial
    let weakestDial: string | null = null;
    if (fiveDialsScores) {
      const sorted = Object.entries(fiveDialsScores).sort(
        ([, a], [, b]) => a - b,
      );
      weakestDial = sorted[0]?.[0] || null;
    }

    // Get recent conversation topics (last 3)
    const allConversations =
      this.dataStore.getAll<Conversation>('conversations');
    const recentTopics = Array.from(allConversations.values())
      .filter((c) => c.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 3)
      .map((c) => c.title);

    // Get streak
    const streakData = this.dataStore.get<StreakData>('streaks', userId);
    const streak = streakData?.currentStreak || 0;

    // Compute belt level
    const beltLevel = this.computeBeltLevel(streak);

    return {
      fiveDialsScores,
      weakestDial,
      recentTopics,
      beltLevel,
      streak,
    };
  }

  private buildContextPrompt(context: {
    fiveDialsScores: Record<string, number> | null;
    weakestDial: string | null;
    recentTopics: string[];
    beltLevel: string;
    streak: number;
  }): string {
    const parts: string[] = [];

    if (context.fiveDialsScores) {
      parts.push(
        `Five Dials scores: ${JSON.stringify(context.fiveDialsScores)}`,
      );
      if (context.weakestDial) {
        parts.push(`Weakest dial: ${context.weakestDial}`);
      }
    } else {
      parts.push(
        'No Five Dials assessment taken yet. Focus on general personal growth.',
      );
    }

    if (context.recentTopics.length > 0) {
      parts.push(
        `Recent conversation topics: ${context.recentTopics.join(', ')}`,
      );
    }

    parts.push(`Belt level: ${context.beltLevel}`);
    parts.push(`Current streak: ${context.streak} days`);

    return parts.join('\n');
  }

  private computeBeltLevel(streak: number): string {
    if (streak >= 90) return 'Black';
    if (streak >= 60) return 'Brown';
    if (streak >= 30) return 'Blue';
    if (streak >= 14) return 'Green';
    if (streak >= 7) return 'Yellow';
    return 'White';
  }

  private getFallbackActions(weakestDial: string): DailyAction[] {
    const fallbacks: Record<string, DailyAction[]> = {
      parent: [
        {
          id: uuidv4(),
          action: 'Have a 10-minute device-free conversation with your child about their day',
          dial: 'parent',
          difficulty: 'easy',
          completed: false,
        },
        {
          id: uuidv4(),
          action: 'Write down one thing each of your children did well today and tell them',
          dial: 'parent',
          difficulty: 'easy',
          completed: false,
        },
        {
          id: uuidv4(),
          action: 'Plan one activity for this weekend that your family will enjoy together',
          dial: 'parent',
          difficulty: 'medium',
          completed: false,
        },
      ],
      partner: [
        {
          id: uuidv4(),
          action: 'Send your wife a text with 3 specific things you appreciate about her',
          dial: 'partner',
          difficulty: 'easy',
          completed: false,
        },
        {
          id: uuidv4(),
          action: 'Ask your wife one open-ended question about her day and listen without fixing',
          dial: 'partner',
          difficulty: 'easy',
          completed: false,
        },
        {
          id: uuidv4(),
          action: 'Take one household task off her plate today without being asked',
          dial: 'partner',
          difficulty: 'medium',
          completed: false,
        },
      ],
      producer: [
        {
          id: uuidv4(),
          action: 'Track every dollar you spend today',
          dial: 'producer',
          difficulty: 'easy',
          completed: false,
        },
        {
          id: uuidv4(),
          action: 'Identify one unnecessary subscription and cancel it',
          dial: 'producer',
          difficulty: 'easy',
          completed: false,
        },
        {
          id: uuidv4(),
          action: 'Write down your top 3 professional goals for this month',
          dial: 'producer',
          difficulty: 'medium',
          completed: false,
        },
      ],
      player: [
        {
          id: uuidv4(),
          action: 'Do 15 minutes of physical activity (walk, push-ups, stretch)',
          dial: 'player',
          difficulty: 'easy',
          completed: false,
        },
        {
          id: uuidv4(),
          action: 'Do one thing purely for fun today, no productivity attached',
          dial: 'player',
          difficulty: 'easy',
          completed: false,
        },
        {
          id: uuidv4(),
          action: 'Reach out to a friend you have not talked to in a while',
          dial: 'player',
          difficulty: 'medium',
          completed: false,
        },
      ],
      power: [
        {
          id: uuidv4(),
          action: 'Spend 5 minutes in silence before checking your phone this morning',
          dial: 'power',
          difficulty: 'easy',
          completed: false,
        },
        {
          id: uuidv4(),
          action: 'Write down one trigger from yesterday and how you could respond better',
          dial: 'power',
          difficulty: 'easy',
          completed: false,
        },
        {
          id: uuidv4(),
          action: 'Keep every small promise you make today, no matter how trivial',
          dial: 'power',
          difficulty: 'medium',
          completed: false,
        },
      ],
    };

    return fallbacks[weakestDial] || fallbacks['power'];
  }

  private todayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private currentWeekString(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
    );
    const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }
}
