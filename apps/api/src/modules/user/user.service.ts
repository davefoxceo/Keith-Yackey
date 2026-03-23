import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  relationshipStatus?: string;
  partnerName?: string;
  childrenCount?: number;
  timezone: string;
  onboardingCompleted: boolean;
  onboardingData?: OnboardingData;
  journeyStartDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface OnboardingData {
  primaryGoal: string;
  biggestChallenge: string;
  relationshipDuration?: string;
  coachingExperience: string;
  commitmentLevel: number; // 1-10
  initialFiveDialsScores: Record<string, number>;
}

interface JourneyStage {
  id: string;
  name: string;
  description: string;
  order: number;
  isComplete: boolean;
  isCurrent: boolean;
  milestones: Array<{ title: string; completed: boolean }>;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private profiles: Map<string, UserProfile> = new Map();
  private deletionRequests: Map<string, { requestedAt: Date; scheduledDeletion: Date }> = new Map();

  private readonly JOURNEY_STAGES: Array<{
    name: string;
    description: string;
    milestones: string[];
  }> = [
    {
      name: 'Awakening',
      description: 'You have taken the first step — acknowledging that growth is possible and necessary.',
      milestones: [
        'Complete onboarding',
        'Take first Five Dials assessment',
        'Have first conversation with Coach Keith',
      ],
    },
    {
      name: 'Foundation',
      description: 'Building the daily habits and self-awareness that everything else rests on.',
      milestones: [
        'Complete 7-day streak',
        'Submit 5 evening reflections',
        'Identify your weakest dial',
        'Complete 3 micro-challenges',
      ],
    },
    {
      name: 'Growth',
      description: 'You are doing the work consistently and starting to see real change.',
      milestones: [
        'Complete 30-day streak',
        'Improve one dial by 2+ points',
        'Join the Brotherhood community',
        'Complete 10 coaching conversations',
      ],
    },
    {
      name: 'Transformation',
      description: 'Your relationships and self-perception are fundamentally shifting.',
      milestones: [
        'Complete 60-day streak',
        'All dials above 6',
        'Health score above 70',
        'Get an accountability partner',
      ],
    },
    {
      name: 'Leadership',
      description: 'You are not just growing yourself — you are leading others and building a legacy.',
      milestones: [
        'Complete 90-day streak',
        'All dials above 8',
        'Mentor another man',
        'Share your testimony',
      ],
    },
  ];

  async getProfile(userId: string) {
    const profile = this.profiles.get(userId);
    if (!profile) {
      // Return a minimal profile (user exists via auth but no profile yet)
      return {
        id: userId,
        onboardingCompleted: false,
        message: 'Complete your onboarding to unlock personalized coaching.',
      };
    }

    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      relationshipStatus: profile.relationshipStatus,
      partnerName: profile.partnerName,
      childrenCount: profile.childrenCount,
      timezone: profile.timezone,
      onboardingCompleted: profile.onboardingCompleted,
      journeyStartDate: profile.journeyStartDate,
      memberSinceDays: Math.floor(
        (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    };
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
      relationshipStatus?: string;
      partnerName?: string;
      childrenCount?: number;
      timezone?: string;
    },
  ) {
    let profile = this.profiles.get(userId);

    if (!profile) {
      // Create a new profile
      profile = {
        id: userId,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: '',
        timezone: data.timezone || 'America/Chicago',
        onboardingCompleted: false,
        journeyStartDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Apply updates
    if (data.firstName !== undefined) profile.firstName = data.firstName;
    if (data.lastName !== undefined) profile.lastName = data.lastName;
    if (data.avatarUrl !== undefined) profile.avatarUrl = data.avatarUrl;
    if (data.relationshipStatus !== undefined)
      profile.relationshipStatus = data.relationshipStatus;
    if (data.partnerName !== undefined) profile.partnerName = data.partnerName;
    if (data.childrenCount !== undefined)
      profile.childrenCount = data.childrenCount;
    if (data.timezone !== undefined) profile.timezone = data.timezone;

    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);

    this.logger.log(`Profile updated for user ${userId}`);

    return this.getProfile(userId);
  }

  async completeOnboarding(
    userId: string,
    data: {
      primaryGoal: string;
      biggestChallenge: string;
      relationshipDuration?: string;
      coachingExperience: string;
      commitmentLevel: number;
      initialFiveDialsScores: Record<string, number>;
      firstName: string;
      lastName: string;
      partnerName?: string;
      childrenCount?: number;
      timezone?: string;
    },
  ) {
    const now = new Date();
    const profile: UserProfile = this.profiles.get(userId) || {
      id: userId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: '',
      timezone: data.timezone || 'America/Chicago',
      onboardingCompleted: false,
      journeyStartDate: now,
      createdAt: now,
      updatedAt: now,
    };

    profile.firstName = data.firstName;
    profile.lastName = data.lastName;
    profile.partnerName = data.partnerName;
    profile.childrenCount = data.childrenCount;
    if (data.timezone) profile.timezone = data.timezone;
    profile.onboardingCompleted = true;
    profile.onboardingData = {
      primaryGoal: data.primaryGoal,
      biggestChallenge: data.biggestChallenge,
      relationshipDuration: data.relationshipDuration,
      coachingExperience: data.coachingExperience,
      commitmentLevel: data.commitmentLevel,
      initialFiveDialsScores: data.initialFiveDialsScores,
    };
    profile.journeyStartDate = now;
    profile.updatedAt = now;

    this.profiles.set(userId, profile);

    this.logger.log(
      `Onboarding completed for user ${userId}: goal="${data.primaryGoal}", commitment=${data.commitmentLevel}/10`,
    );

    // Generate personalized welcome message based on onboarding data
    const welcomeMessage = this.generateWelcomeMessage(data);

    return {
      success: true,
      profile: await this.getProfile(userId),
      welcomeMessage,
      nextSteps: [
        'Take your first deep-dive Five Dials assessment',
        'Start a coaching conversation about your primary goal',
        'Set up your morning kickstart notification',
      ],
      journeyStage: this.JOURNEY_STAGES[0].name,
    };
  }

  async getJourneyMap(userId: string) {
    const profile = this.profiles.get(userId);
    if (!profile || !profile.onboardingCompleted) {
      return {
        message: 'Complete onboarding to unlock your journey map.',
        stages: this.JOURNEY_STAGES.map((stage, index) => ({
          name: stage.name,
          description: stage.description,
          order: index + 1,
          isComplete: false,
          isCurrent: index === 0,
          isLocked: index > 0,
        })),
      };
    }

    const daysSinceStart = Math.floor(
      (Date.now() - profile.journeyStartDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // Determine current stage based on days and activity
    // In production, this would check actual milestone completion from all services
    let currentStageIndex = 0;
    if (daysSinceStart >= 90) currentStageIndex = 4;
    else if (daysSinceStart >= 60) currentStageIndex = 3;
    else if (daysSinceStart >= 30) currentStageIndex = 2;
    else if (daysSinceStart >= 7) currentStageIndex = 1;

    const stages: JourneyStage[] = this.JOURNEY_STAGES.map(
      (stage, index) => ({
        id: `stage-${index + 1}`,
        name: stage.name,
        description: stage.description,
        order: index + 1,
        isComplete: index < currentStageIndex,
        isCurrent: index === currentStageIndex,
        milestones: stage.milestones.map((m) => ({
          title: m,
          completed: index < currentStageIndex, // Simplified; real logic checks each milestone
        })),
      }),
    );

    return {
      currentStage: stages[currentStageIndex].name,
      currentStageOrder: currentStageIndex + 1,
      totalStages: stages.length,
      daysSinceStart,
      stages,
      onboardingGoal: profile.onboardingData?.primaryGoal,
    };
  }

  async requestDataDeletion(userId: string) {
    const scheduledDeletion = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ); // 30 days

    this.deletionRequests.set(userId, {
      requestedAt: new Date(),
      scheduledDeletion,
    });

    this.logger.warn(
      `Data deletion requested for user ${userId}, scheduled for ${scheduledDeletion.toISOString()}`,
    );

    return {
      acknowledged: true,
      scheduledDeletion,
      message:
        'Your data deletion request has been received. All personal data will be permanently deleted within 30 days. You can cancel this request by contacting support before the scheduled date.',
      cancellationDeadline: scheduledDeletion,
    };
  }

  private generateWelcomeMessage(data: {
    primaryGoal: string;
    commitmentLevel: number;
    initialFiveDialsScores: Record<string, number>;
    firstName: string;
  }): string {
    const scores = data.initialFiveDialsScores;
    const lowestDial = scores
      ? Object.entries(scores).sort(([, a], [, b]) => a - b)[0]
      : null;

    let message = `Welcome to the brotherhood, ${data.firstName}. `;
    message += `You said your primary goal is "${data.primaryGoal}" — that takes guts to name. `;

    if (data.commitmentLevel >= 8) {
      message +=
        'Your commitment level tells me you are ready to do the hard work. Good. ';
    } else if (data.commitmentLevel >= 5) {
      message +=
        'Your willingness to be here is the start. Commitment grows when you see results. ';
    } else {
      message +=
        "Honesty about where you are is the first step. Let's build that commitment together. ";
    }

    if (lowestDial) {
      message += `Your ${lowestDial[0]} dial is where we will start. Small wins there will ripple through everything else.`;
    }

    return message;
  }
}
