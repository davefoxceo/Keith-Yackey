# ADR-044: Referral Program

**Status:** Proposed
**Date:** 2026-03-24

## Context

Coach Keith's user base grows primarily through word-of-mouth -- men tell other men about the app after seeing results. There is currently no mechanism to incentivize or track this organic growth. Keith's existing clients frequently recommend the app in group chats, Voxer conversations, and at live events, but there is no reward system and no way to attribute new signups to existing users.

A referral program turns every active user into a distribution channel. The key design challenge is making the incentive meaningful (a free month for both parties) without creating abuse vectors where someone creates fake accounts to farm free months. The program also ties into the belt system (ADR-037) to reward users who actively build the brotherhood.

## Decision

Implement a **two-sided referral program** where both the referrer and the new user receive a free month of their current subscription tier when the referral qualifies.

### Referral Code System

Every user gets a unique, permanent referral code generated at account creation:

| Component | Format | Example |
|-----------|--------|---------|
| **Referral URL** | `app.coachkeith.com/ref/{CODE}` | `app.coachkeith.com/ref/DAVE123` |
| **Code format** | First name + random 3-digit number | `DAVE123`, `MIKE847` |
| **Collision handling** | Append extra digit if code exists | `DAVE1234` |
| **Custom codes** | Premium+ users can set a custom code | `app.coachkeith.com/ref/DAVETHEWARRIOR` |

### Referral Flow

1. Existing user shares their referral link via text, email, or social media (share sheet built into app)
2. New user clicks link and lands on signup page with referral code pre-filled
3. New user completes signup and starts a paid subscription
4. Referral enters **pending** status -- 30-day activation clock starts
5. After 30 days, if the referred user is still active (completed at least 2 assessments and 3 chat sessions), the referral **qualifies**
6. Both users receive a free month applied as a Stripe coupon on their next billing cycle
7. Referrer gets a push notification: "Your referral [name] just qualified -- you both earned a free month"

### Referral Dashboard (User-Facing)

Accessible from the user's profile page:

- **Your referral code** with copy and share buttons
- **Referrals sent**: total link shares (tracked via share events)
- **Pending referrals**: signed up but not yet qualified (shows days remaining)
- **Qualified referrals**: completed 30-day activation
- **Rewards earned**: total free months received
- **Referral streak**: consecutive months with at least one qualified referral

### Admin Referral Leaderboard (Keith-Facing)

In the admin dashboard, Keith sees:

- Top referrers ranked by qualified referral count
- Referral conversion funnel: link clicks --> signups --> qualified
- Revenue impact: estimated MRR from referred users
- Ability to grant bonus rewards to top referrers (e.g., free merch, event tickets)

### Belt System Integration (ADR-037)

Referral activity contributes to belt progression:

| Referral Milestone | Belt Bonus |
|-------------------|------------|
| 1 qualified referral | +5 belt XP |
| 3 qualified referrals | +20 belt XP + "Brotherhood Builder" badge |
| 10 qualified referrals | +50 belt XP + "Recruiter" badge |
| 25 qualified referrals | Automatic belt promotion consideration |

### Anti-Abuse Rules

- Referred user must complete a paid subscription (no free tier referrals)
- Referred user must stay active for 30 days: minimum 2 assessments and 3 chat sessions
- Same email domain limit: max 3 referrals from the same email domain per referrer (prevents company email farming)
- Self-referral detection: referrer and referred cannot share the same device fingerprint or IP address
- Maximum 10 free months banked per user (prevents infinite free usage)
- Flagged accounts: if a referrer has 5+ referrals that churn within 60 days, their referral privileges are paused for review

### Stripe Integration

- Free month applied as a one-time 100% discount coupon on the next billing cycle
- Coupon created via Stripe API with metadata linking to the referral record
- If user is on annual plan, credit equivalent of one month's value applied as account credit
- Referral rewards do not stack with other promotions (applied after any existing discounts)

## Implementation

```
src/services/referral.service.ts       -- referral code generation, tracking, qualification
src/services/referral-reward.service.ts -- Stripe coupon creation and application
src/models/referral.model.ts           -- referral record types and status enum
src/components/referral-dashboard.tsx   -- user-facing referral stats and sharing
```

### ReferralService API

- `generateCode(userId) -> string` -- creates unique referral code
- `trackClick(code) -> void` -- records link click
- `createReferral(referrerCode, newUserId) -> Referral` -- creates pending referral
- `checkQualification(referralId) -> boolean` -- evaluates 30-day activity criteria
- `applyReward(referralId) -> void` -- triggers Stripe coupon for both parties
- `getReferralStats(userId) -> ReferralStats` -- dashboard data
- `getLeaderboard() -> ReferrerRanking[]` -- admin leaderboard

## Consequences

### Positive

- Turns engaged users into a scalable acquisition channel with zero ad spend
- Two-sided reward creates motivation for both referrer and new user
- 30-day qualification window ensures only genuine users generate rewards
- Belt system integration makes referrals part of the gamification loop
- Keith gets visibility into his most influential community members

### Negative

- Free months reduce short-term revenue per referred user
- Anti-abuse rules add complexity and may frustrate legitimate referrers (e.g., colleagues on same company email)
- 30-day wait for reward gratification may reduce sharing motivation
- Stripe coupon management adds billing complexity

### Mitigations

- Track referral LTV: referred users who stay past 30 days typically have higher lifetime value than organic signups, offsetting the free month cost
- Clear communication in the referral dashboard about why the 30-day window exists ("we want to make sure your friend actually gets value from the app")
- Weekly email nudge to referrers with pending referrals: "Your friend [name] is 12 days into their journey -- they're doing great"
- Monitor abuse flags monthly and adjust thresholds based on actual patterns
