import type { DialType } from './assessment';

export interface StreakData {
  currentCount: number;
  longestCount: number;
  lastEngagementDate: Date;
  startDate: Date;
}

export interface DailyEngagement {
  date: string;
  morningKickstartOpened: boolean;
  eveningReflectionCompleted: boolean;
  conversationsHad: number;
  assessmentCompleted: boolean;
}

export enum MilestoneType {
  FIRST_CONVERSATION = 'FIRST_CONVERSATION',
  FIRST_ASSESSMENT = 'FIRST_ASSESSMENT',
  FIRST_CHALLENGE_COMPLETED = 'FIRST_CHALLENGE_COMPLETED',
  STREAK_7_DAYS = 'STREAK_7_DAYS',
  STREAK_30_DAYS = 'STREAK_30_DAYS',
  STREAK_90_DAYS = 'STREAK_90_DAYS',
  STREAK_365_DAYS = 'STREAK_365_DAYS',
  ALL_DIALS_ASSESSED = 'ALL_DIALS_ASSESSED',
  FIRST_COMMUNITY_POST = 'FIRST_COMMUNITY_POST',
  ACCOUNTABILITY_PARTNER_MATCHED = 'ACCOUNTABILITY_PARTNER_MATCHED',
  TEN_CHALLENGES_COMPLETED = 'TEN_CHALLENGES_COMPLETED',
  FIFTY_CHALLENGES_COMPLETED = 'FIFTY_CHALLENGES_COMPLETED',
  MARRIAGE_STAGE_UPGRADE = 'MARRIAGE_STAGE_UPGRADE',
  BOOK_COMPLETED = 'BOOK_COMPLETED',
  ALL_FRAMEWORKS_EXPLORED = 'ALL_FRAMEWORKS_EXPLORED',
}

export interface Milestone {
  type: MilestoneType;
  earnedAt: Date;
  description: string;
}

export interface PromptContent {
  id: string;
  message: string;
  actionPrompt: string;
  targetDial?: DialType;
}
