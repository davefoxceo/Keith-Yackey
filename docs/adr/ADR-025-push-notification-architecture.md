# ADR-025: Push Notification Architecture

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
Push notifications are essential for user engagement and retention in the Coach Keith AI app. Notifications serve multiple purposes: daily coaching reminders ("Time for your morning check-in with Keith"), accountability partner messages, Brotherhood community activity, live event reminders, and streak maintenance alerts ("Don't break your 14-day streak — check in now"). A critical requirement is per-user delivery time customization — Keith's coaching methodology emphasizes personalized routines, so a user who sets their morning routine at 5:30 AM should receive their coaching reminder at 5:30 AM in their local timezone, not when a batch job happens to run. We evaluated Firebase Cloud Messaging (FCM) alone, OneSignal, and a custom scheduling layer on top of FCM/APNs.

**Decision:**
We will use Firebase Cloud Messaging (FCM) for Android delivery and Apple Push Notification service (APNs) for iOS delivery, with a custom scheduling service built on Amazon SQS and AWS Lambda for per-user delivery timing.

1. **Notification Service (NestJS):** A dedicated `NotificationModule` in the NestJS backend handles notification creation, template rendering, and scheduling. Notification types are defined as an enum with associated templates (title, body, deep link, category). The service exposes an internal API consumed by other modules (messaging, community, coaching engine).

2. **Device Registration:** On app launch, the React Native client registers its FCM token (Android) or APNs device token (iOS) with the backend. Tokens are stored in a `device_tokens` table (user_id, token, platform, created_at, last_seen_at). Stale tokens (last_seen > 30 days) are pruned by a scheduled job.

3. **Per-User Scheduling (SQS + Lambda):** When a notification is scheduled for a specific user time (e.g., "morning reminder at user's preferred time"), the notification service calculates the UTC delivery time based on the user's timezone (stored in their profile) and sends an SQS message with a `DelaySeconds` value (up to 15 minutes) or a scheduled EventBridge rule for longer delays. A Lambda function (`notification-dispatcher`, Node.js 20 runtime) processes the SQS queue and dispatches via FCM/APNs. For recurring notifications (daily reminders), a cron-based Lambda runs every minute, queries users whose notification time falls within the current minute (using a PostgreSQL index on `notification_preferences.utc_send_time`), and enqueues individual dispatch messages.

4. **Delivery Infrastructure:** FCM HTTP v1 API for Android (supports data messages for background handling). APNs via HTTP/2 (`@parse/node-apn` v6) for iOS, using token-based authentication (.p8 key). Both channels support notification categories for actionable notifications (e.g., "Check In" button on daily reminders that deep-links to the coaching screen).

5. **Analytics and Tracking:** Notification delivery, open, and dismissal events are tracked via a `notification_events` table. Open rates and engagement metrics feed into a dashboard (Grafana, per ADR-027) to optimize notification timing and content.

**Consequences:**

### Pros (+)
- Per-user delivery timing supports Keith's personalized coaching methodology
- Direct use of FCM and APNs avoids third-party abstraction layers and their associated costs
- SQS + Lambda is a cost-effective, serverless scheduling solution that scales to millions of notifications
- Notification templates are version-controlled with application code, enabling A/B testing of messaging
- Deep linking from notifications drives users directly to relevant app screens

### Cons (-)
- Custom scheduling logic is more complex than batch notification sends via OneSignal or Firebase
- Managing both FCM and APNs separately requires platform-specific error handling (token invalidation, rate limits, payload size differences)
- SQS `DelaySeconds` is capped at 15 minutes; longer delays require EventBridge scheduled rules, adding architectural complexity
- Per-minute cron for recurring notifications requires careful database indexing to avoid slow queries at scale

### Tradeoffs
We chose per-user scheduling precision over the simplicity of batch sends. A simpler approach would send daily reminders in hourly batches (e.g., all users in UTC-5 get their reminder at the same time), but this conflicts with Keith's emphasis on personalized routines. The custom SQS + Lambda scheduler adds development and operational complexity but delivers notifications at the exact time each user has configured, which directly supports coaching outcomes and user retention. OneSignal was considered as an all-in-one alternative but adds per-notification costs at scale and limits customization of the scheduling logic.
