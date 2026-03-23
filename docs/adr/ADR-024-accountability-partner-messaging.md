# ADR-024: Accountability Partner Messaging

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
A key feature of Coach Keith's methodology is accountability partnerships — pairs of users who commit to holding each other accountable for goals, habits, and commitments. These partners need a private, real-time messaging channel to check in with each other between coaching sessions. We evaluated several approaches: a third-party chat SDK (SendBird at ~$0.01/MAU, Stream Chat at ~$0.0075/MAU), a managed service (AWS AppSync with GraphQL subscriptions), and building custom messaging on our existing NestJS + Socket.io infrastructure. The messaging requirements are deliberately simple — 1:1 only, text messages, no group chats, no file sharing in V1 — which makes a full chat SDK overkill.

**Decision:**
We will implement custom 1:1 messaging using Socket.io on the existing NestJS backend, with message persistence in PostgreSQL. This is a Premium-tier feature, gated by the entitlements system (ADR-021).

1. **WebSocket Layer:** Socket.io (v4.7+) is already integrated into the NestJS backend for real-time notifications. We extend it with a `messaging` namespace (`/messaging`). Authentication uses the same JWT tokens as the REST API, validated on WebSocket handshake via Socket.io middleware.

2. **Data Model (PostgreSQL 16):** Tables include `accountability_pairs` (id, user_a_id, user_b_id, status enum [pending, active, dissolved], created_at) and `messages` (id, pair_id, sender_id, content text, read_at timestamp nullable, created_at). Messages are indexed on `(pair_id, created_at DESC)` for efficient pagination. A composite unique constraint on `accountability_pairs` prevents duplicate pairings.

3. **Message Flow:** When User A sends a message, the Socket.io server persists it to PostgreSQL, then emits the message event to User B's connected socket (if online). If User B is offline, the message is persisted and a push notification is triggered via the notification service (ADR-025). Read receipts are updated via a `message:read` event that sets `read_at` on all unread messages in the conversation up to the specified message ID.

4. **Pairing Logic:** Users can request an accountability partner through the app. V1 uses manual pairing — users browse a list of available partners (filtered by goals, timezone) and send a request. The system enforces a limit of one active accountability partner at a time. Partner dissolution has a 7-day cooldown before a new partner can be selected.

5. **Message Retention:** Messages are retained for 90 days, after which a scheduled job archives them to S3 (compressed JSON) and deletes from PostgreSQL. This keeps the messages table performant and reduces storage costs.

**Consequences:**

### Pros (+)
- Zero additional infrastructure cost — reuses existing NestJS + Socket.io + PostgreSQL stack
- Simple architecture appropriate for 1:1 messaging without group chat complexity
- Full control over message data, retention policies, and privacy compliance
- Tight integration with the entitlements and notification systems already being built
- No per-MAU fees from chat SDK vendors

### Cons (-)
- No built-in features like typing indicators, message reactions, or rich media (must be built manually if needed later)
- Socket.io does not scale horizontally without a Redis adapter (`@socket.io/redis-adapter`), which must be configured for multi-instance ECS deployments
- Custom implementation lacks the polish and edge-case handling of mature chat SDKs (offline queuing, delivery guarantees, conflict resolution)
- Message search requires implementing full-text search (PostgreSQL `tsvector`) rather than getting it out of the box

### Tradeoffs
We chose to leverage existing infrastructure and keep costs at zero over adopting a feature-rich messaging SDK. SendBird or Stream Chat would provide typing indicators, rich media, delivery receipts, and offline support out of the box, but at a per-MAU cost that adds up and introduces a third-party dependency for a core feature. Given that the messaging scope is deliberately limited to 1:1 text-only in V1, a custom solution is proportionate to the requirements. If future phases demand group messaging, rich media, or threaded conversations, we will re-evaluate third-party SDKs at that point.
