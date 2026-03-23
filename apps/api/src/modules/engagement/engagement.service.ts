import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  lastActiveDate: string; // YYYY-MM-DD
  kickstartOpenedToday: boolean;
  reflectionSubmittedToday: boolean;
}

interface Reflection {
  id: string;
  userId: string;
  gratitude: string;
  winOfTheDay: string;
  challengeFaced: string;
  tomorrowIntention: string;
  moodScore: number; // 1-10
  createdAt: Date;
}

interface Milestone {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);
  private streaks: Map<string, StreakData> = new Map();
  private reflections: Map<string, Reflection[]> = new Map();
  private milestones: Map<string, Milestone[]> = new Map();

  private readonly MORNING_PROMPTS: string[] = [
    "What's one thing you can do today to make your wife feel valued?",
    'Name one area of your life where you\'ve been coasting. What would "all in" look like today?',
    "If your kids described your energy this week, what would they say? What do you want them to say?",
    "What conversation have you been avoiding? Today's the day to lean into it.",
    'What would the best version of you do today? Now go do it.',
    "You're not just building a marriage — you're building a legacy. What brick are you laying today?",
    'Comfort is the enemy of growth. Where are you choosing comfort over courage?',
    "What's one habit that's quietly stealing your peace? What replaces it?",
    'How did you show up for your family yesterday? How will you show up better today?',
    "Leadership starts at home. What's one way you'll lead with integrity today?",
    'Your wife doesn\'t need a perfect man — she needs a present one. How will you be present today?',
    'Every man has a gap between who he is and who he wants to be. What closes that gap today?',
    'Stop managing your marriage and start investing in it. What investment are you making today?',
    "What's draining your energy that you need to cut? What energizes you that you need to add?",
    "Real strength isn't hiding your struggles. Who can you be honest with today?",
  ];

  private readonly MILESTONE_DEFINITIONS = [
    { type: 'streak_3', threshold: 3, title: 'Getting Started', description: '3-day streak! Consistency is building.', icon: 'flame' },
    { type: 'streak_7', threshold: 7, title: 'One Week Strong', description: '7-day streak! A full week of growth.', icon: 'fire' },
    { type: 'streak_14', threshold: 14, title: 'Two Week Warrior', description: '14-day streak! This is becoming a habit.', icon: 'trophy' },
    { type: 'streak_30', threshold: 30, title: 'Monthly Master', description: '30-day streak! You are a different man than you were a month ago.', icon: 'crown' },
    { type: 'streak_60', threshold: 60, title: 'Sixty Day Soldier', description: '60-day streak! Your commitment is exceptional.', icon: 'shield' },
    { type: 'streak_90', threshold: 90, title: 'Quarter Year Legend', description: '90-day streak! You have fundamentally transformed your habits.', icon: 'star' },
    { type: 'streak_365', threshold: 365, title: 'Year of the Man', description: '365-day streak! A full year of daily growth. You are elite.', icon: 'diamond' },
    { type: 'reflections_10', threshold: 10, title: 'Reflective Mind', description: '10 evening reflections completed.', icon: 'moon' },
    { type: 'reflections_50', threshold: 50, title: 'Deep Thinker', description: '50 reflections — you know yourself well.', icon: 'brain' },
    { type: 'reflections_100', threshold: 100, title: 'Centurion', description: '100 reflections. Mastery through self-awareness.', icon: 'medal' },
  ];

  async getStreak(userId: string) {
    const streak = this.getOrCreateStreak(userId);
    const today = this.todayString();

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalDaysActive: streak.totalDaysActive,
      lastActiveDate: streak.lastActiveDate,
      isActiveToday: streak.lastActiveDate === today,
      kickstartOpenedToday: streak.kickstartOpenedToday,
      reflectionSubmittedToday: streak.reflectionSubmittedToday,
      nextMilestone: this.getNextMilestone(streak.currentStreak),
    };
  }

  async recordKickstartOpened(userId: string) {
    const streak = this.getOrCreateStreak(userId);
    const today = this.todayString();

    if (!streak.kickstartOpenedToday || streak.lastActiveDate !== today) {
      streak.kickstartOpenedToday = true;
      this.updateStreak(streak, today);
    }

    this.logger.log(`Kickstart opened by user ${userId}`);

    return {
      streak: streak.currentStreak,
      isNewDay: streak.lastActiveDate === today,
    };
  }

  async getTodayPrompt(userId: string) {
    // Deterministic but varied daily prompt based on date and user
    const today = new Date();
    const dayOfYear =
      Math.floor(
        (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
          (1000 * 60 * 60 * 24),
      );
    const hash =
      (dayOfYear * 31 + userId.charCodeAt(0)) % this.MORNING_PROMPTS.length;

    const streak = this.getOrCreateStreak(userId);

    return {
      date: this.todayString(),
      prompt: this.MORNING_PROMPTS[hash],
      streakDays: streak.currentStreak,
      motivationalNote: this.getMotivationalNote(streak.currentStreak),
    };
  }

  async submitReflection(
    userId: string,
    data: {
      gratitude: string;
      winOfTheDay: string;
      challengeFaced: string;
      tomorrowIntention: string;
      moodScore: number;
    },
  ) {
    const reflection: Reflection = {
      id: uuidv4(),
      userId,
      ...data,
      createdAt: new Date(),
    };

    const userReflections = this.reflections.get(userId) || [];
    userReflections.push(reflection);
    this.reflections.set(userId, userReflections);

    // Update streak
    const streak = this.getOrCreateStreak(userId);
    const today = this.todayString();
    streak.reflectionSubmittedToday = true;
    this.updateStreak(streak, today);

    // Check for reflection milestones
    const newMilestones = this.checkReflectionMilestones(
      userId,
      userReflections.length,
    );

    this.logger.log(
      `Reflection submitted by user ${userId} (mood: ${data.moodScore}/10, total: ${userReflections.length})`,
    );

    return {
      id: reflection.id,
      streak: streak.currentStreak,
      totalReflections: userReflections.length,
      moodTrend: this.computeMoodTrend(userReflections),
      newMilestones,
    };
  }

  async getMilestones(userId: string) {
    const earned = this.milestones.get(userId) || [];
    const streak = this.getOrCreateStreak(userId);

    // Show earned and upcoming milestones
    const upcoming = this.MILESTONE_DEFINITIONS
      .filter((m) => !earned.some((e) => e.type === m.type))
      .filter((m) => {
        if (m.type.startsWith('streak_')) return m.threshold > streak.currentStreak;
        if (m.type.startsWith('reflections_')) {
          const reflectionCount = (this.reflections.get(userId) || []).length;
          return m.threshold > reflectionCount;
        }
        return true;
      })
      .slice(0, 3)
      .map((m) => ({
        type: m.type,
        title: m.title,
        description: m.description,
        icon: m.icon,
        progress: this.getMilestoneProgress(userId, m),
      }));

    return {
      earned: earned.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        description: m.description,
        icon: m.icon,
        earnedAt: m.earnedAt,
      })),
      upcoming,
      totalEarned: earned.length,
    };
  }

  private getOrCreateStreak(userId: string): StreakData {
    let streak = this.streaks.get(userId);
    if (!streak) {
      streak = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalDaysActive: 0,
        lastActiveDate: '',
        kickstartOpenedToday: false,
        reflectionSubmittedToday: false,
      };
      this.streaks.set(userId, streak);
    }
    return streak;
  }

  private updateStreak(streak: StreakData, today: string) {
    if (streak.lastActiveDate === today) {
      return; // Already counted today
    }

    const yesterday = this.yesterdayString();

    if (streak.lastActiveDate === yesterday) {
      // Continuing the streak
      streak.currentStreak++;
    } else if (streak.lastActiveDate === '') {
      // First day ever
      streak.currentStreak = 1;
    } else {
      // Streak broken - reset
      streak.currentStreak = 1;
    }

    streak.lastActiveDate = today;
    streak.totalDaysActive++;

    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    // Check for streak milestones
    this.checkStreakMilestones(streak.userId, streak.currentStreak);

    // Reset daily flags for new day
    streak.kickstartOpenedToday = false;
    streak.reflectionSubmittedToday = false;
  }

  private checkStreakMilestones(userId: string, currentStreak: number) {
    const earned = this.milestones.get(userId) || [];
    const newMilestones: Milestone[] = [];

    for (const def of this.MILESTONE_DEFINITIONS.filter((m) =>
      m.type.startsWith('streak_'),
    )) {
      if (
        currentStreak >= def.threshold &&
        !earned.some((e) => e.type === def.type)
      ) {
        const milestone: Milestone = {
          id: uuidv4(),
          userId,
          type: def.type,
          title: def.title,
          description: def.description,
          icon: def.icon,
          earnedAt: new Date(),
        };
        newMilestones.push(milestone);
      }
    }

    if (newMilestones.length > 0) {
      this.milestones.set(userId, [...earned, ...newMilestones]);
      this.logger.log(
        `New milestones earned by ${userId}: ${newMilestones.map((m) => m.title).join(', ')}`,
      );
    }
  }

  private checkReflectionMilestones(
    userId: string,
    totalReflections: number,
  ): Array<{ type: string; title: string }> {
    const earned = this.milestones.get(userId) || [];
    const newMilestones: Milestone[] = [];

    for (const def of this.MILESTONE_DEFINITIONS.filter((m) =>
      m.type.startsWith('reflections_'),
    )) {
      if (
        totalReflections >= def.threshold &&
        !earned.some((e) => e.type === def.type)
      ) {
        const milestone: Milestone = {
          id: uuidv4(),
          userId,
          type: def.type,
          title: def.title,
          description: def.description,
          icon: def.icon,
          earnedAt: new Date(),
        };
        newMilestones.push(milestone);
      }
    }

    if (newMilestones.length > 0) {
      this.milestones.set(userId, [...earned, ...newMilestones]);
    }

    return newMilestones.map((m) => ({ type: m.type, title: m.title }));
  }

  private getMilestoneProgress(
    userId: string,
    def: { type: string; threshold: number },
  ): { current: number; target: number; percentage: number } {
    let current = 0;
    if (def.type.startsWith('streak_')) {
      current = this.getOrCreateStreak(userId).currentStreak;
    } else if (def.type.startsWith('reflections_')) {
      current = (this.reflections.get(userId) || []).length;
    }

    return {
      current,
      target: def.threshold,
      percentage: Math.min(100, Math.round((current / def.threshold) * 100)),
    };
  }

  private getNextMilestone(currentStreak: number): { title: string; daysAway: number } | null {
    const streakMilestones = this.MILESTONE_DEFINITIONS
      .filter((m) => m.type.startsWith('streak_'))
      .sort((a, b) => a.threshold - b.threshold);

    const next = streakMilestones.find((m) => m.threshold > currentStreak);
    if (!next) return null;

    return {
      title: next.title,
      daysAway: next.threshold - currentStreak,
    };
  }

  private computeMoodTrend(
    reflections: Reflection[],
  ): { average: number; trend: string } | null {
    if (reflections.length < 2) return null;

    const recent = reflections.slice(-7);
    const average =
      Math.round(
        (recent.reduce((sum, r) => sum + r.moodScore, 0) / recent.length) * 10,
      ) / 10;

    if (recent.length < 3) return { average, trend: 'insufficient_data' };

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstAvg =
      firstHalf.reduce((s, r) => s + r.moodScore, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((s, r) => s + r.moodScore, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;
    const trend = diff > 0.5 ? 'improving' : diff < -0.5 ? 'declining' : 'stable';

    return { average, trend };
  }

  private getMotivationalNote(streak: number): string {
    if (streak === 0) return "Today is day one. Let's go.";
    if (streak < 3) return 'Building momentum. Keep showing up.';
    if (streak < 7)
      return 'You are proving to yourself that you can be consistent.';
    if (streak < 14)
      return 'A full week and counting. This is becoming who you are.';
    if (streak < 30)
      return 'Two weeks of daily growth. Your family can feel the difference.';
    if (streak < 60)
      return 'A month strong. You are in the top 10% of men doing the work.';
    if (streak < 90)
      return 'Elite consistency. You are not the same man who started this journey.';
    return 'You are a testament to what daily commitment looks like. Lead on.';
  }

  private todayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private yesterdayString(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
}
