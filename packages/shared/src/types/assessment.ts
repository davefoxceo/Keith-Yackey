import type { UserId } from './user';

export enum DialType {
  PARENT = 'PARENT',
  PARTNER = 'PARTNER',
  PRODUCER = 'PRODUCER',
  PLAYER = 'PLAYER',
  POWER = 'POWER',
}

export interface DialRating {
  dial: DialType;
  score: number;
  notes?: string;
}

export type AssessmentSource = 'SELF' | 'AI_SUGGESTED';

export interface FiveDialsAssessment {
  id: string;
  userId: UserId;
  ratings: [DialRating, DialRating, DialRating, DialRating, DialRating];
  overallScore: number;
  createdAt: Date;
  source: AssessmentSource;
}

export type HealthTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';

export interface MarriageHealthScore {
  overallScore: number;
  dialBreakdown: Record<DialType, number>;
  trend: HealthTrend;
  period: string;
}

export type ChallengeStatus = 'ACTIVE' | 'COMPLETED' | 'MISSED';

export interface MicroChallenge {
  id: string;
  userId: UserId;
  dial: DialType;
  description: string;
  deadline: Date;
  status: ChallengeStatus;
  completedAt?: Date;
}

export type TrendDirection = 'up' | 'down' | 'stable';

export interface DialTrend {
  dial: DialType;
  currentScore: number;
  previousScore: number;
  direction: TrendDirection;
  periodDays: number;
}
