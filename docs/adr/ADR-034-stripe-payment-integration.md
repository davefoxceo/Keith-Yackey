# ADR-034: Stripe Payment Integration

**Status:** Proposed
**Date:** 2026-03-24
**Related:** ADR-035 (Admin Dashboard), ADR-004 (Database)

---

## Context

Coach Keith AI is moving from a free demo to a paid subscription product. We need a payment system that handles recurring billing, free trials, subscription upgrades/downgrades, and integrates with our NestJS backend. The product has three distinct tiers based on Keith's coaching levels, each unlocking progressively more features (AI chat modes, assessment frequency, direct access to Keith).

We evaluated three options:

1. **Stripe** -- industry standard for SaaS, excellent API, Checkout and Customer Portal reduce frontend work
2. **Paddle** -- handles sales tax automatically but has higher fees and less flexibility on pricing changes
3. **RevenueCat** -- optimized for mobile app stores, not ideal for a web-first product

---

## Decision

**Use Stripe as the sole payment provider with three subscription tiers, a 14-day free trial requiring no credit card, and feature gating enforced server-side.**

### Subscription Tiers

| Tier | Price | Trial | Features |
|------|-------|-------|----------|
| **Core** | $29/mo | 14 days free | AI coach chat (Coach mode only), weekly 5-dial assessment, basic dashboard |
| **Premium** | $79/mo | 14 days free | All 4 chat modes, daily assessments, challenge system, belt progression, screenshot analysis |
| **Elite** | $199/mo | 14 days free | Everything in Premium + monthly 1-on-1 call with Keith, priority chat, admin-flagged attention |

### Signup Flow

1. User creates account (email + password, no card required)
2. 14-day trial starts immediately at the Core tier
3. At trial end, user is prompted to select a tier and enter payment via Stripe Checkout
4. If no payment entered, account moves to a read-only state (can view history but not chat)

### Billing Management

- **Stripe Checkout** handles the initial payment collection and plan selection
- **Stripe Customer Portal** (hosted by Stripe) handles plan changes, payment method updates, invoice history, and cancellation
- No custom billing UI needed in the app -- Stripe Portal covers it

---

## Implementation

### Backend (NestJS)

```
src/
  payments/
    payments.module.ts
    payments.controller.ts       # POST /payments/checkout, POST /payments/portal
    payments.service.ts           # Stripe SDK calls
    stripe-webhook.controller.ts  # POST /webhooks/stripe
    subscription.guard.ts         # SubscriptionGuard decorator
    subscription.decorator.ts     # @RequiresTier('premium')
```

### Webhook Events to Handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription, update user tier in DataStore |
| `customer.subscription.updated` | Handle plan changes (upgrade/downgrade) |
| `customer.subscription.deleted` | Move user to read-only state |
| `invoice.payment_failed` | Flag user, send retry notification |
| `invoice.paid` | Log revenue event for admin dashboard |

### Feature Gating

The `SubscriptionGuard` is a NestJS guard that reads the user's current tier from their profile and compares it against the required tier for the endpoint.

```typescript
@RequiresTier('premium')
@Post('/chat/screenshot')
async analyzeScreenshot() { ... }
```

Tier hierarchy: `elite > premium > core > trial > expired`. A user with a higher tier can access all lower-tier features.

### Revenue Tracking

Every `invoice.paid` webhook writes a revenue record to DataStore:

```json
{
  "userId": "user_abc",
  "amount": 7900,
  "tier": "premium",
  "period": "2026-03",
  "stripeInvoiceId": "in_xxx"
}
```

This powers the revenue metrics on the admin dashboard (ADR-035).

---

## Consequences

### Positive

- Stripe Checkout and Portal eliminate 80% of billing UI work
- 14-day no-card trial reduces signup friction
- Server-side feature gating prevents unauthorized access to premium features
- Webhook-driven architecture keeps subscription state in sync without polling
- Revenue records in DataStore enable real-time admin analytics

### Negative

- Stripe takes 2.9% + $0.30 per transaction
- Webhook reliability requires idempotent handlers and a dead-letter queue for failed processing
- Trial-to-paid conversion requires careful UX (email reminders at day 7, 12, 14)
- Three tiers add complexity to feature gating logic across the app

### Risks

- If Stripe has an outage, new signups are blocked (mitigation: graceful error page, not a hard crash)
- Users sharing accounts to avoid payment (mitigation: single active session enforcement at Elite tier)
