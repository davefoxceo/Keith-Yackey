# ADR-021: Authorization and Feature Gating

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Coach Keith AI mobile app operates on a tiered subscription model (Free, Premium, Elite) managed through RevenueCat. Different subscription tiers unlock different features — for example, the AI coaching experience has usage limits on the free tier, Brotherhood community access is Premium-only, and accountability partner messaging is Elite-only. We need a system that reliably gates features based on a user's current subscription state, handles subscription changes in near-real-time, and does not introduce excessive latency into every API request. A full Role-Based Access Control (RBAC) system was considered but deemed unnecessarily complex for a consumer app where permissions map directly to subscription tiers rather than organizational roles.

**Decision:**
We will implement an entitlements-based authorization system tightly integrated with RevenueCat's subscription state. The architecture works as follows:

1. **Entitlements Model:** Each subscription tier maps to a set of entitlements (e.g., `ai_coaching_unlimited`, `brotherhood_access`, `accountability_messaging`, `live_events`). Entitlements are defined as a static configuration in the backend, versioned alongside application code.

2. **RevenueCat Webhook Sync:** RevenueCat server-to-server webhooks (v2) push subscription lifecycle events (initial purchase, renewal, cancellation, billing issues, grace period) to a dedicated NestJS webhook controller. On each event, the user's entitlements are recalculated and persisted to both PostgreSQL (source of truth) and Redis (cache).

3. **Redis Caching:** Active entitlements for each user are cached in Redis with a 5-minute TTL. This avoids hitting PostgreSQL on every request while ensuring subscription changes propagate within an acceptable window. Cache keys follow the pattern `entitlements:{userId}`.

4. **Feature Gate Middleware:** A NestJS guard (`@RequireEntitlement('ai_coaching_unlimited')`) is applied at the controller or route level. The guard checks the Redis cache first, falls back to PostgreSQL on cache miss, and returns HTTP 403 with a structured error body indicating which upgrade path unlocks the feature.

5. **Client-Side Gating:** The mobile app also checks entitlements locally via RevenueCat's React Native SDK (`Purchases.getCustomerInfo()`) to hide UI elements for inaccessible features, preventing unnecessary API calls.

**Consequences:**

### Pros (+)
- Simple mental model: subscription tier equals entitlements equals feature access
- Low-latency authorization checks via Redis (sub-millisecond lookups)
- RevenueCat handles all platform-specific billing complexity (App Store, Google Play)
- Webhook-driven updates keep entitlements current without polling
- Client-side gating provides immediate UI feedback without network round-trips

### Cons (-)
- 5-minute TTL means a user who upgrades may wait up to 5 minutes for backend access (client-side access is immediate via RevenueCat SDK)
- No support for fine-grained, per-resource permissions if needed in the future
- Dependency on RevenueCat webhook reliability for entitlement accuracy

### Tradeoffs
We chose the simplicity of an entitlements model over the flexibility of a full RBAC system. RBAC would support future scenarios like team accounts, admin roles, or per-resource permissions, but introduces significant complexity in schema design, permission evaluation, and debugging. For a consumer coaching app with 3 subscription tiers and roughly 8-10 distinct feature gates, entitlements are a natural fit. If the product evolves to include team or enterprise features, we can layer RBAC on top of the entitlements foundation without replacing it.
