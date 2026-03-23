# ADR-020: Subscription and Billing Integration

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
Coach Keith AI operates on a tiered subscription model with three levels: Free Trial (7 days, full access), Standard ($29.99/month), and Premium ($79.99/month with additional features like Emergency SOS mode and priority response times). The app will be distributed via both Apple App Store and Google Play Store, each with their own in-app purchase (IAP) billing systems. Apple mandates that digital content subscriptions purchased within iOS apps use their billing system (with a 30% commission, reducing to 15% after the first year via the App Store Small Business Program). Google Play has a similar 15% commission for subscriptions. Managing two separate billing systems, handling receipt validation, subscription status synchronization, grace periods, billing retries, and entitlement checks is notoriously complex and error-prone.

**Decision:**
Use RevenueCat as a unified cross-platform subscription management layer that abstracts both app store billing systems behind a single API.

**RevenueCat Configuration:**

- **Products defined in RevenueCat dashboard:**
  - `coach_keith_standard_monthly` — $29.99/month, 7-day free trial
  - `coach_keith_premium_monthly` — $79.99/month, 7-day free trial
  - Future: annual plans at discounted rates (`coach_keith_standard_annual`, `coach_keith_premium_annual`)

- **Entitlements (access control):**
  - `standard_access` — Unlocks: Daily Coaching, Deep Dive, Ask Keith, Marriage Meeting Prep, Five Dials, basic Journey Map
  - `premium_access` — Unlocks: Everything in Standard + Emergency SOS, priority AI response, extended conversation history, advanced analytics, AI memory with full context

- **Offerings (presentation to users):**
  - `default` offering shows Standard and Premium side by side
  - `upgrade` offering shown to Standard subscribers highlighting Premium benefits
  - Offerings can be changed remotely via RevenueCat dashboard without app update

**Mobile Integration (React Native):**
```typescript
import Purchases from 'react-native-purchases';

// Initialize on app start
await Purchases.configure({
  apiKey: Platform.OS === 'ios'
    ? 'appl_revenucat_api_key'
    : 'goog_revenucat_api_key',
  appUserID: supabaseUserId,  // Link RevenueCat to Supabase auth user
});

// Check entitlements
const customerInfo = await Purchases.getCustomerInfo();
const isPremium = customerInfo.entitlements.active['premium_access'] !== undefined;
const isStandard = customerInfo.entitlements.active['standard_access'] !== undefined;

// Purchase flow
const offerings = await Purchases.getOfferings();
const premiumPackage = offerings.current?.availablePackages.find(
  p => p.identifier === '$rc_monthly' && p.product.identifier === 'coach_keith_premium_monthly'
);
await Purchases.purchasePackage(premiumPackage);
```

**Backend Webhook Integration:**
RevenueCat sends server-side webhook events to the Coach Keith API for subscription state changes:

- **Webhook endpoint:** `POST /api/webhooks/revenucat`
- **Events handled:**
  - `INITIAL_PURCHASE` — Create subscription record, update user tier, send welcome message
  - `RENEWAL` — Update `current_period_end`, log renewal event
  - `CANCELLATION` — Set `canceled_at`, trigger retention flow (in-app message, optional pause offer)
  - `BILLING_ISSUE` — Set status to `past_due`, send notification to user
  - `EXPIRATION` — Downgrade to free tier, restrict access to premium/standard features
  - `PRODUCT_CHANGE` — Handle upgrade/downgrade between Standard and Premium
  - `TRANSFER` — Handle subscription transfer between platforms (user switches from iOS to Android)

- **Webhook security:** Validated via RevenueCat webhook secret in `Authorization` header
- **Idempotency:** Each webhook event has a unique `event_id`; duplicates are detected and skipped via a `processed_webhooks` table

**Subscription State Synchronization:**
- Primary source of truth: RevenueCat (it validates receipts directly with Apple/Google)
- Local database (`subscriptions` table per ADR-016) is a synchronized copy for fast entitlement checks
- On app launch: `Purchases.getCustomerInfo()` syncs latest state from RevenueCat
- Backend API checks local database for entitlements (faster than calling RevenueCat API per request)
- Webhook events keep local database in sync with RevenueCat

**Pricing and Revenue Model:**
| Tier | Price | Apple (30%) | RevenueCat (1%) | Net Revenue |
|------|-------|-------------|-----------------|-------------|
| Standard | $29.99/mo | $9.00 | $0.30 | $20.69/mo |
| Premium | $79.99/mo | $24.00 | $0.80 | $55.19/mo |

- After Year 1 with Apple Small Business Program (15%): Standard nets $25.19, Premium nets $67.19
- RevenueCat pricing: Free up to $2,500/month in tracked revenue, then 1% of tracked revenue
- No RevenueCat fees during MVP phase (well under $2,500/month threshold)

**Free Trial Management:**
- 7-day free trial configured at the App Store / Google Play level (not in application code)
- RevenueCat tracks trial status and sends `INITIAL_PURCHASE` event when trial converts
- Trial expiration without conversion: `EXPIRATION` webhook triggers downgrade to limited free experience
- Trial users get full Standard-tier access to maximize conversion likelihood
- In-app messaging on day 5: "Your trial ends in 2 days" with upgrade prompt

**Edge Case Handling (managed by RevenueCat):**
- **Grace periods:** Apple/Google provide a grace period (up to 16 days for Apple, 30 days for Google) for billing failures. RevenueCat maintains `BILLING_ISSUE` status during this period — user retains access.
- **Billing retries:** App stores automatically retry failed charges. RevenueCat sends `RENEWAL` if retry succeeds.
- **Refunds:** RevenueCat sends `CANCELLATION` with `cancel_reason: CUSTOMER_SUPPORT` for refunded subscriptions.
- **Family sharing:** Not supported in V1 (single user per subscription).
- **Promotional offers:** RevenueCat supports introductory and promotional offers configured in app store dashboards.

**Consequences:**

### Pros (+)
- Single API abstracts both Apple and Google billing complexities
- Receipt validation handled server-side by RevenueCat (no custom validation code)
- Handles edge cases (grace periods, billing retries, platform transfers) that would take months to implement manually
- Excellent analytics dashboard: MRR, churn rate, trial conversion, LTV per cohort
- Free tier during MVP means zero additional cost until the product generates meaningful revenue
- Offerings can be updated remotely without app store review
- Server-side webhook integration ensures backend state stays synchronized

### Cons (-)
- RevenueCat fee (1% of tracked revenue) adds to the already significant app store commission (30%/15%)
- Vendor dependency: if RevenueCat has an outage, subscription checks may fail (mitigated by local database cache)
- Another third-party dependency in the stack (Supabase for auth, RevenueCat for billing, Pinecone for vectors)
- Limited customization of the purchase flow UI compared to building custom billing screens
- RevenueCat's free tier has limited support — paid plans required for priority support

### Tradeoffs
The primary tradeoff is **reliability and speed over cost optimization**. Building custom App Store and Google Play billing integration would eliminate the RevenueCat fee but would require months of development to handle the myriad edge cases (receipt validation, server notifications, grace periods, billing retries, cross-platform transfers, subscription status reconciliation). RevenueCat has spent years solving these problems and handles them correctly. The 1% fee is a small price compared to the engineering time saved and the revenue lost to incorrectly handled billing edge cases. At $100K ARR, the RevenueCat fee would be ~$1,000/year — far less than a single month of an engineer's time debugging App Store receipt validation issues.
