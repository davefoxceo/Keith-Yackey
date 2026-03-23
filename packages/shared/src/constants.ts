import { DialType } from './types/assessment';
import { SubscriptionTier } from './types/subscription';

export const DIALS = [
  {
    name: 'Parent',
    type: DialType.PARENT,
    icon: 'baby',
    description: 'How present and intentional you are as a father.',
  },
  {
    name: 'Partner',
    type: DialType.PARTNER,
    icon: 'heart',
    description: 'The quality and depth of your connection with your wife.',
  },
  {
    name: 'Producer',
    type: DialType.PRODUCER,
    icon: 'briefcase',
    description: 'Your professional output, career growth, and financial contribution.',
  },
  {
    name: 'Player',
    type: DialType.PLAYER,
    icon: 'gamepad',
    description: 'Time for fun, hobbies, friendships, and personal enjoyment.',
  },
  {
    name: 'Power',
    type: DialType.POWER,
    icon: 'zap',
    description: 'Your physical health, energy, fitness, and mental wellness.',
  },
] as const;

export const SUBSCRIPTION_PRICES: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE_TRIAL]: 0,
  [SubscriptionTier.STANDARD]: 29.99,
  [SubscriptionTier.PREMIUM]: 59.99,
};

export const CONVERSATION_LIMITS: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE_TRIAL]: 10,
  [SubscriptionTier.STANDARD]: 100,
  [SubscriptionTier.PREMIUM]: Infinity,
};

export const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365] as const;
