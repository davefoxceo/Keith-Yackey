import type { UserId } from './user';

export enum SubscriptionTier {
  FREE_TRIAL = 'FREE_TRIAL',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  GRACE_PERIOD = 'GRACE_PERIOD',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export type SubscriptionPlatform = 'ios' | 'android' | 'web';

export interface Subscription {
  id: string;
  userId: UserId;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  platform: SubscriptionPlatform;
  startDate: Date;
  currentPeriodEnd: Date;
  cancelledAt?: Date;
}

export interface EntitlementSet {
  conversationLimit: number;
  communityAccess: boolean;
  bookAccess: boolean;
  liveEvents: boolean;
  priorityAI: boolean;
  accountabilityPartner: boolean;
}
