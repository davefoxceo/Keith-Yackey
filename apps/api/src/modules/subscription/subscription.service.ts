import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ELITE = 'elite',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
}

interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  platform: 'ios' | 'android' | 'web';
  originalTransactionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndDate?: Date;
  cancelledAt?: Date;
  createdAt: Date;
}

interface Entitlement {
  feature: string;
  enabled: boolean;
  limit?: number;
  used?: number;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private subscriptions: Map<string, Subscription> = new Map();

  private readonly TIER_ENTITLEMENTS: Record<
    SubscriptionTier,
    Array<{ feature: string; enabled: boolean; limit?: number }>
  > = {
    [SubscriptionTier.FREE]: [
      { feature: 'coaching_conversations', enabled: true, limit: 3 },
      { feature: 'five_dials_assessment', enabled: true, limit: 1 },
      { feature: 'morning_kickstart', enabled: true },
      { feature: 'evening_reflection', enabled: false },
      { feature: 'podcast_access', enabled: true, limit: 5 },
      { feature: 'book_chapters', enabled: true, limit: 1 },
      { feature: 'frameworks', enabled: true, limit: 1 },
      { feature: 'brotherhood_feed', enabled: false },
      { feature: 'accountability_partner', enabled: false },
      { feature: 'crisis_mode', enabled: false },
      { feature: 'ai_content_recommendations', enabled: false },
      { feature: 'micro_challenges', enabled: true, limit: 1 },
      { feature: 'coaching_modes', enabled: false },
      { feature: 'journey_map', enabled: false },
    ],
    [SubscriptionTier.STARTER]: [
      { feature: 'coaching_conversations', enabled: true, limit: 20 },
      { feature: 'five_dials_assessment', enabled: true },
      { feature: 'morning_kickstart', enabled: true },
      { feature: 'evening_reflection', enabled: true },
      { feature: 'podcast_access', enabled: true },
      { feature: 'book_chapters', enabled: true },
      { feature: 'frameworks', enabled: true },
      { feature: 'brotherhood_feed', enabled: true },
      { feature: 'accountability_partner', enabled: false },
      { feature: 'crisis_mode', enabled: false },
      { feature: 'ai_content_recommendations', enabled: true },
      { feature: 'micro_challenges', enabled: true },
      { feature: 'coaching_modes', enabled: false },
      { feature: 'journey_map', enabled: true },
    ],
    [SubscriptionTier.PRO]: [
      { feature: 'coaching_conversations', enabled: true },
      { feature: 'five_dials_assessment', enabled: true },
      { feature: 'morning_kickstart', enabled: true },
      { feature: 'evening_reflection', enabled: true },
      { feature: 'podcast_access', enabled: true },
      { feature: 'book_chapters', enabled: true },
      { feature: 'frameworks', enabled: true },
      { feature: 'brotherhood_feed', enabled: true },
      { feature: 'accountability_partner', enabled: true },
      { feature: 'crisis_mode', enabled: true },
      { feature: 'ai_content_recommendations', enabled: true },
      { feature: 'micro_challenges', enabled: true },
      { feature: 'coaching_modes', enabled: true },
      { feature: 'journey_map', enabled: true },
    ],
    [SubscriptionTier.ELITE]: [
      { feature: 'coaching_conversations', enabled: true },
      { feature: 'five_dials_assessment', enabled: true },
      { feature: 'morning_kickstart', enabled: true },
      { feature: 'evening_reflection', enabled: true },
      { feature: 'podcast_access', enabled: true },
      { feature: 'book_chapters', enabled: true },
      { feature: 'frameworks', enabled: true },
      { feature: 'brotherhood_feed', enabled: true },
      { feature: 'accountability_partner', enabled: true },
      { feature: 'crisis_mode', enabled: true },
      { feature: 'ai_content_recommendations', enabled: true },
      { feature: 'micro_challenges', enabled: true },
      { feature: 'coaching_modes', enabled: true },
      { feature: 'journey_map', enabled: true },
      { feature: 'priority_support', enabled: true },
      { feature: 'group_coaching_sessions', enabled: true },
      { feature: 'advanced_analytics', enabled: true },
    ],
  };

  async getSubscription(userId: string) {
    const subscription = this.subscriptions.get(userId);

    if (!subscription) {
      // Return free tier info
      return {
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        isFreeTier: true,
        upgradeOptions: this.getUpgradeOptions(SubscriptionTier.FREE),
      };
    }

    // Check if subscription has expired
    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.currentPeriodEnd < new Date()
    ) {
      subscription.status = SubscriptionStatus.EXPIRED;
    }

    return {
      id: subscription.id,
      tier: subscription.tier,
      status: subscription.status,
      platform: subscription.platform,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEndDate: subscription.trialEndDate,
      cancelledAt: subscription.cancelledAt,
      isFreeTier: false,
      daysRemaining: Math.max(
        0,
        Math.ceil(
          (subscription.currentPeriodEnd.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      ),
      upgradeOptions:
        subscription.tier !== SubscriptionTier.ELITE
          ? this.getUpgradeOptions(subscription.tier)
          : [],
    };
  }

  async verifyReceipt(
    userId: string,
    data: {
      receipt: string;
      platform: 'ios' | 'android';
      productId: string;
    },
  ) {
    // In production, this verifies with Apple/Google servers
    // Apple: POST https://buy.itunes.apple.com/verifyReceipt
    // Google: androidpublisher.purchases.subscriptions.get

    this.logger.log(
      `Verifying ${data.platform} receipt for user ${userId}: product=${data.productId}`,
    );

    // Determine tier from product ID
    const tierMap: Record<string, SubscriptionTier> = {
      'com.coachkeith.starter.monthly': SubscriptionTier.STARTER,
      'com.coachkeith.starter.annual': SubscriptionTier.STARTER,
      'com.coachkeith.pro.monthly': SubscriptionTier.PRO,
      'com.coachkeith.pro.annual': SubscriptionTier.PRO,
      'com.coachkeith.elite.monthly': SubscriptionTier.ELITE,
      'com.coachkeith.elite.annual': SubscriptionTier.ELITE,
    };

    const tier = tierMap[data.productId];
    if (!tier) {
      throw new BadRequestException(`Unknown product ID: ${data.productId}`);
    }

    const isAnnual = data.productId.includes('.annual');
    const periodDays = isAnnual ? 365 : 30;
    const now = new Date();

    const subscription: Subscription = {
      id: uuidv4(),
      userId,
      tier,
      status: SubscriptionStatus.ACTIVE,
      platform: data.platform,
      originalTransactionId: `txn_${uuidv4().substring(0, 8)}`,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(
        now.getTime() + periodDays * 24 * 60 * 60 * 1000,
      ),
      createdAt: now,
    };

    this.subscriptions.set(userId, subscription);

    this.logger.log(
      `Subscription activated: user=${userId}, tier=${tier}, period=${periodDays}d`,
    );

    return {
      verified: true,
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      entitlements: this.getEntitlements(tier),
    };
  }

  async getEntitlements(tierOrUserId: string): Promise<{
    tier: SubscriptionTier;
    entitlements: Entitlement[];
  }> {
    let tier: SubscriptionTier;

    // Check if it is a tier or a userId
    if (Object.values(SubscriptionTier).includes(tierOrUserId as SubscriptionTier)) {
      tier = tierOrUserId as SubscriptionTier;
    } else {
      const subscription = this.subscriptions.get(tierOrUserId);
      tier = subscription?.tier || SubscriptionTier.FREE;

      // Check for expired subscription
      if (
        subscription &&
        subscription.currentPeriodEnd < new Date() &&
        subscription.status !== SubscriptionStatus.CANCELLED
      ) {
        tier = SubscriptionTier.FREE;
      }
    }

    const tierEntitlements = this.TIER_ENTITLEMENTS[tier] || this.TIER_ENTITLEMENTS[SubscriptionTier.FREE];

    return {
      tier,
      entitlements: tierEntitlements.map((e) => ({
        feature: e.feature,
        enabled: e.enabled,
        limit: e.limit,
      })),
    };
  }

  async checkEntitlement(
    userId: string,
    feature: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const { tier, entitlements } = await this.getEntitlements(userId);
    const entitlement = entitlements.find((e) => e.feature === feature);

    if (!entitlement) {
      return { allowed: false, reason: 'Unknown feature' };
    }

    if (!entitlement.enabled) {
      return {
        allowed: false,
        reason: `${feature} requires a ${this.getMinimumTier(feature)} subscription or higher`,
      };
    }

    return { allowed: true };
  }

  private getMinimumTier(feature: string): string {
    for (const tier of [
      SubscriptionTier.STARTER,
      SubscriptionTier.PRO,
      SubscriptionTier.ELITE,
    ]) {
      const entitlements = this.TIER_ENTITLEMENTS[tier];
      const ent = entitlements.find((e) => e.feature === feature);
      if (ent?.enabled) return tier;
    }
    return SubscriptionTier.ELITE;
  }

  private getUpgradeOptions(currentTier: SubscriptionTier) {
    const tiers = [
      SubscriptionTier.STARTER,
      SubscriptionTier.PRO,
      SubscriptionTier.ELITE,
    ];
    const currentIndex = tiers.indexOf(currentTier);

    return tiers.slice(currentIndex + 1).map((tier) => {
      const newFeatures = this.TIER_ENTITLEMENTS[tier]
        .filter((e) => e.enabled)
        .filter((e) => {
          const current = this.TIER_ENTITLEMENTS[currentTier].find(
            (ce) => ce.feature === e.feature,
          );
          return !current?.enabled || (e.limit === undefined && current?.limit !== undefined);
        })
        .map((e) => e.feature.replace(/_/g, ' '));

      return { tier, newFeatures };
    });
  }
}
