# Subscription Bounded Context

## Overview

The Subscription Context manages all billing, entitlements, and access control for the Coach Keith app. It integrates with Apple App Store and Google Play Store for in-app purchases, manages trial periods, and enforces feature gating based on subscription tier. This context is the single source of truth for what a user can and cannot access.

**Core Responsibilities:**
- Manage subscription lifecycle (trial, active, cancelled, expired)
- Process and verify receipts from App Store and Google Play
- Map subscription tiers to entitlements (feature access)
- Enforce conversation limits for free/trial users
- Handle billing failures and grace periods
- Present upsell opportunities at contextually appropriate moments
- Track billing events for revenue analytics

**Upstream Dependencies:** Identity Context (user identity for subscription binding)

**Downstream Consumers:** All other contexts consume entitlements -- Coaching (conversation limits), Community (Brotherhood access), Content (premium content gating), Live Events (event access), Engagement (premium prompt features)

---

## Aggregates

### Subscription

The Subscription aggregate represents a user's current subscription state, including their tier, billing status, and trial information.

```typescript
interface Subscription {
  readonly id: string;
  readonly userId: UserId;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingPlatform: BillingPlatform;
  trialPeriod: TrialPeriod | null;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelledAt: Timestamp | null;
  cancellationReason: string | null;
  gracePeriodEnd: Timestamp | null;
  pricePoint: PricePoint;
  receiptToken: ReceiptToken | null;
  billingHistory: BillingEvent[];
  createdAt: Timestamp;
  updatedAt: Timestamp;

  startTrial(trialDays: number): TrialStarted;
  expireTrial(): TrialExpired;
  activate(receiptToken: ReceiptToken, pricePoint: PricePoint): SubscriptionCreated;
  upgrade(newTier: SubscriptionTier, newPrice: PricePoint): SubscriptionUpgraded;
  downgrade(newTier: SubscriptionTier, newPrice: PricePoint): SubscriptionDowngraded;
  renew(receiptToken: ReceiptToken): SubscriptionRenewed;
  cancel(reason: string): SubscriptionCancelled;
  recordPaymentFailure(error: string): PaymentFailed;
  startGracePeriod(graceDays: number): GracePeriodStarted;
  isActive(): boolean;
  isInGracePeriod(): boolean;
  isInTrial(): boolean;
  daysUntilExpiry(): number;
}
```

**Invariants:**
- A user can have only one active subscription at a time
- Trial period can only be used once per user (enforced across subscription resets)
- A subscription cannot be upgraded to the same tier
- Downgrade takes effect at the end of the current billing period
- Grace period cannot exceed 16 days (App Store maximum)
- A cancelled subscription remains active until the end of the current billing period
- Receipt tokens must be verified with the billing platform before activation
- Billing events are append-only and immutable

### Entitlement

The Entitlement aggregate maps a subscription tier to concrete feature access, serving as the access control policy.

```typescript
interface Entitlement {
  readonly id: string;
  readonly userId: UserId;
  readonly subscriptionId: string;
  tier: SubscriptionTier;
  entitlementSet: EntitlementSet;
  conversationLimit: ConversationLimit;
  grantedAt: Timestamp;
  expiresAt: Timestamp;
  isActive: boolean;

  grant(tier: SubscriptionTier): EntitlementGranted;
  revoke(reason: string): EntitlementRevoked;
  updateForTier(newTier: SubscriptionTier): void;
  checkAccess(feature: FeatureName): boolean;
  getRemainingConversations(): number;
  consumeConversation(): void;
  resetConversationCount(): void;
}

type FeatureName =
  | 'ai_coaching'
  | 'ai_coaching_unlimited'
  | 'five_dials_assessment'
  | 'daily_engagement'
  | 'content_library_basic'
  | 'content_library_full'
  | 'brotherhood_read'
  | 'brotherhood_post'
  | 'accountability_partner'
  | 'live_events'
  | 'live_events_recording'
  | 'progress_history_full'
  | 'ascend_brotherhood';
```

**Invariants:**
- Entitlements must always reflect the current subscription tier
- When a subscription is revoked, entitlements must be revoked within the same transaction
- Free tier entitlements are always granted (they are the baseline)
- Conversation count resets at the start of each billing period
- Conversation limit cannot go below zero
- A revoked entitlement cannot grant access

---

## Entities

### BillingEvent

An immutable record of a billing-related event for audit and analytics.

```typescript
interface BillingEvent {
  readonly id: string;
  readonly subscriptionId: string;
  readonly userId: UserId;
  readonly type: BillingEventType;
  readonly occurredAt: Timestamp;
  readonly amount: number | null; // In cents
  readonly currency: string;
  readonly platform: BillingPlatform;
  readonly receiptToken: ReceiptToken | null;
  readonly metadata: Record<string, unknown>;
}

type BillingEventType =
  | 'trial_started'
  | 'trial_expired'
  | 'payment_success'
  | 'payment_failed'
  | 'subscription_created'
  | 'subscription_renewed'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_cancelled'
  | 'refund_issued'
  | 'grace_period_started'
  | 'grace_period_ended';
```

### TrialPeriod

Tracks the user's trial period state.

```typescript
interface TrialPeriod {
  readonly id: string;
  readonly userId: UserId;
  readonly startedAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly durationDays: number;
  readonly convertedAt: Timestamp | null; // When they became a paying subscriber
  readonly expired: boolean;
  readonly remindersSent: number; // Number of trial-ending reminders sent
}
```

---

## Value Objects

```typescript
/** Subscription tier definitions */
type SubscriptionTier =
  | 'free' // Basic access, limited AI conversations
  | 'starter' // Entry paid tier
  | 'growth' // Mid tier with full content access
  | 'ascend_brotherhood'; // Premium tier with full access + accountability

/** Current state of a subscription */
type SubscriptionStatus =
  | 'trialing' // In free trial period
  | 'active' // Paid and current
  | 'past_due' // Payment failed, in grace period
  | 'cancelled' // User cancelled, active until period end
  | 'expired' // Period ended, no renewal
  | 'paused'; // Subscription paused (Play Store feature)

/** Which app store processes the billing */
type BillingPlatform =
  | 'apple_app_store'
  | 'google_play_store'
  | 'stripe_web' // Future: web-based subscriptions
  | 'promotional'; // Admin-granted access

/** Price configuration for a subscription tier */
interface PricePoint {
  readonly tierId: string;
  readonly tier: SubscriptionTier;
  readonly billingPeriod: 'monthly' | 'annual';
  readonly priceInCents: number;
  readonly currency: string; // ISO 4217
  readonly displayPrice: string; // Formatted for display, e.g., "$19.99/mo"
  readonly annualSavingsPercent: number | null; // For annual plans
}

/** Set of features available at a given tier */
interface EntitlementSet {
  readonly tier: SubscriptionTier;
  readonly features: Record<FeatureName, boolean>;
  readonly limits: {
    readonly aiConversationsPerDay: number; // -1 for unlimited
    readonly coachingSessionMinutes: number; // Per session max
    readonly contentLibraryAccess: 'basic' | 'full';
    readonly brotherhoodAccess: 'read_only' | 'full' | 'none';
    readonly accountabilityPartners: number; // 0, 1, or 2
    readonly liveEventAccess: boolean;
    readonly progressHistoryDays: number; // How far back they can see
  };
}

/** Conversation limit tracking */
interface ConversationLimit {
  readonly dailyLimit: number; // -1 for unlimited
  readonly usedToday: number;
  readonly resetAt: Timestamp; // Next reset time
  readonly periodStart: Timestamp;
}

/** Receipt verification token from app store */
interface ReceiptToken {
  readonly platform: BillingPlatform;
  readonly token: string; // The raw receipt/purchase token
  readonly transactionId: string; // Platform-specific transaction ID
  readonly productId: string; // Platform-specific product ID
  readonly purchaseDate: Timestamp;
  readonly expiresDate: Timestamp | null;
  readonly isVerified: boolean;
  readonly verifiedAt: Timestamp | null;
}
```

---

## Domain Events

```typescript
interface TrialStarted {
  readonly eventType: 'subscription.trial_started';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly subscriptionId: string;
    readonly trialDurationDays: number;
    readonly trialExpiresAt: Timestamp;
    readonly entitlementSet: EntitlementSet;
  };
}

interface TrialExpired {
  readonly eventType: 'subscription.trial_expired';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly subscriptionId: string;
    readonly convertedToPayment: boolean;
  };
}

interface SubscriptionCreated {
  readonly eventType: 'subscription.created';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly subscriptionId: string;
    readonly tier: SubscriptionTier;
    readonly billingPlatform: BillingPlatform;
    readonly pricePoint: PricePoint;
    readonly fromTrial: boolean;
  };
}

interface SubscriptionUpgraded {
  readonly eventType: 'subscription.upgraded';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly subscriptionId: string;
    readonly previousTier: SubscriptionTier;
    readonly newTier: SubscriptionTier;
    readonly previousPrice: PricePoint;
    readonly newPrice: PricePoint;
    readonly effectiveImmediately: boolean;
  };
}

interface SubscriptionDowngraded {
  readonly eventType: 'subscription.downgraded';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly subscriptionId: string;
    readonly previousTier: SubscriptionTier;
    readonly newTier: SubscriptionTier;
    readonly effectiveDate: Timestamp; // End of current period
  };
}

interface SubscriptionRenewed {
  readonly eventType: 'subscription.renewed';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly subscriptionId: string;
    readonly tier: SubscriptionTier;
    readonly newPeriodEnd: Timestamp;
    readonly amountInCents: number;
    readonly currency: string;
  };
}

interface SubscriptionCancelled {
  readonly eventType: 'subscription.cancelled';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly subscriptionId: string;
    readonly tier: SubscriptionTier;
    readonly reason: string;
    readonly activeUntil: Timestamp; // Remains active until period end
    readonly wasInTrial: boolean;
  };
}

interface PaymentFailed {
  readonly eventType: 'subscription.payment_failed';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly subscriptionId: string;
    readonly tier: SubscriptionTier;
    readonly failureReason: string;
    readonly attemptNumber: number;
    readonly nextRetryAt: Timestamp | null;
    readonly gracePeriodActive: boolean;
  };
}

interface GracePeriodStarted {
  readonly eventType: 'subscription.grace_period_started';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly subscriptionId: string;
    readonly gracePeriodEnd: Timestamp;
    readonly graceDays: number;
  };
}

interface EntitlementGranted {
  readonly eventType: 'subscription.entitlement_granted';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly entitlementId: string;
    readonly tier: SubscriptionTier;
    readonly features: Record<FeatureName, boolean>;
  };
}

interface EntitlementRevoked {
  readonly eventType: 'subscription.entitlement_revoked';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly entitlementId: string;
    readonly previousTier: SubscriptionTier;
    readonly reason: string;
    readonly fallbackTier: SubscriptionTier; // Usually 'free'
  };
}

interface AscendBrotherhoodUpsellPresented {
  readonly eventType: 'subscription.ascend_brotherhood_upsell_presented';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly userId: UserId;
    readonly triggerContext: UpsellTriggerContext;
    readonly currentTier: SubscriptionTier;
    readonly suggestedTier: SubscriptionTier;
    readonly pricePoint: PricePoint;
  };
}

type UpsellTriggerContext =
  | 'conversation_limit_reached'
  | 'brotherhood_post_attempt'
  | 'accountability_partner_request'
  | 'live_event_registration'
  | 'premium_content_access'
  | 'progress_history_limit'
  | 'milestone_earned'
  | 'streak_milestone';
```

---

## Repositories

```typescript
interface SubscriptionRepository {
  /** Find subscription by ID */
  findById(id: string): Promise<Subscription | null>;

  /** Find the active subscription for a user (at most one) */
  findActiveByUserId(userId: UserId): Promise<Subscription | null>;

  /** Find all subscriptions for a user (including historical) */
  findAllByUserId(userId: UserId): Promise<Subscription[]>;

  /** Find subscriptions expiring within a date range (for renewal processing) */
  findExpiringSoon(startDate: Timestamp, endDate: Timestamp): Promise<Subscription[]>;

  /** Find subscriptions in grace period */
  findInGracePeriod(): Promise<Subscription[]>;

  /** Find trials expiring within a date range (for reminder notifications) */
  findTrialsExpiringSoon(withinDays: number): Promise<Subscription[]>;

  /** Check if a user has ever used a trial */
  hasUsedTrial(userId: UserId): Promise<boolean>;

  /** Persist subscription state */
  save(subscription: Subscription): Promise<void>;
}

interface EntitlementRepository {
  /** Find current entitlement for a user */
  findByUserId(userId: UserId): Promise<Entitlement | null>;

  /** Find entitlement by subscription */
  findBySubscriptionId(subscriptionId: string): Promise<Entitlement | null>;

  /** Persist entitlement */
  save(entitlement: Entitlement): Promise<void>;
}

interface BillingEventRepository {
  /** Get billing history for a subscription */
  findBySubscriptionId(subscriptionId: string): Promise<BillingEvent[]>;

  /** Get billing history for a user across all subscriptions */
  findByUserId(userId: UserId): Promise<BillingEvent[]>;

  /** Get billing events by type within a date range (for analytics) */
  findByTypeAndDateRange(
    type: BillingEventType,
    startDate: Timestamp,
    endDate: Timestamp
  ): Promise<BillingEvent[]>;

  /** Persist a billing event (append-only) */
  save(event: BillingEvent): Promise<void>;

  /** Get revenue metrics for a period */
  getRevenueMetrics(
    startDate: Timestamp,
    endDate: Timestamp
  ): Promise<{
    totalRevenue: number;
    newSubscriptions: number;
    renewals: number;
    churnedSubscriptions: number;
    trialConversions: number;
    averageRevenuePerUser: number;
  }>;
}

interface ReceiptRepository {
  /** Find receipt by transaction ID (for deduplication) */
  findByTransactionId(transactionId: string, platform: BillingPlatform): Promise<ReceiptToken | null>;

  /** Persist a verified receipt */
  save(receipt: ReceiptToken): Promise<void>;

  /** Find unverified receipts for retry processing */
  findUnverified(): Promise<ReceiptToken[]>;
}
```

---

## Domain Services

### SubscriptionLifecycleService

Manages the full subscription lifecycle including trial management and billing integration.

```typescript
interface SubscriptionLifecycleService {
  /** Start a free trial for a new user */
  startTrial(userId: UserId, trialDays?: number): Promise<{
    subscription: Subscription;
    entitlement: Entitlement;
    events: DomainEvent[];
  }>;

  /** Process a purchase receipt and activate/upgrade a subscription */
  processPurchase(
    userId: UserId,
    receiptToken: ReceiptToken,
    tier: SubscriptionTier
  ): Promise<{
    subscription: Subscription;
    entitlement: Entitlement;
    events: DomainEvent[];
  }>;

  /** Handle a renewal notification from the app store */
  processRenewal(
    userId: UserId,
    receiptToken: ReceiptToken
  ): Promise<{
    subscription: Subscription;
    events: DomainEvent[];
  }>;

  /** Handle a cancellation */
  processCancellation(
    userId: UserId,
    reason: string
  ): Promise<{
    subscription: Subscription;
    events: DomainEvent[];
  }>;

  /** Handle a payment failure from the app store */
  processPaymentFailure(
    userId: UserId,
    error: string,
    attemptNumber: number
  ): Promise<{
    subscription: Subscription;
    events: DomainEvent[];
  }>;

  /** Run periodic job to expire trials and ended grace periods */
  processExpirations(): Promise<DomainEvent[]>;
}
```

### UpsellService

Determines when and how to present upgrade opportunities.

```typescript
interface UpsellService {
  /** Check if an upsell should be presented given the current context */
  shouldPresentUpsell(
    userId: UserId,
    context: UpsellTriggerContext,
    currentEntitlement: Entitlement
  ): Promise<{
    shouldPresent: boolean;
    suggestedTier: SubscriptionTier | null;
    pricePoint: PricePoint | null;
    messagingVariant: string | null;
  }>;

  /** Record that an upsell was presented (for frequency capping) */
  recordUpsellPresentation(
    userId: UserId,
    context: UpsellTriggerContext,
    suggestedTier: SubscriptionTier
  ): Promise<void>;

  /** Get upsell conversion analytics */
  getConversionMetrics(
    startDate: Timestamp,
    endDate: Timestamp
  ): Promise<{
    presentedCount: number;
    convertedCount: number;
    conversionRate: number;
    topConvertingContexts: { context: UpsellTriggerContext; rate: number }[];
  }>;
}
```
