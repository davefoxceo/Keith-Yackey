# ADR-041: Email and Push Notification System

**Status:** Proposed
**Date:** 2026-03-24

## Context

Coach Keith AI currently has no way to reach users outside of the app. Engagement data from similar coaching apps shows that push notifications and email reminders are the primary drivers of daily return visits. Keith's coaching methodology depends on daily consistency -- the Five Dials assessment, streak tracking, and challenge completion all require the user to show up every day. Without proactive outreach, users who miss a day are likely to miss a week, and users who miss a week rarely come back.

The app is a Progressive Web App (PWA) with an existing service worker (`sw.js`), which means web push notifications are already architecturally possible without a native app.

## Decision

Implement a **NotificationService** in the NestJS API that handles both email delivery and web push notifications, using **Resend** for email and the **Web Push API** for browser notifications.

### Email Provider: Resend

| Criteria | Resend | SendGrid | Amazon SES |
|----------|--------|----------|------------|
| Developer experience | Excellent (modern API, React Email support) | Good | Minimal |
| Deliverability | High (dedicated IPs available) | High | High (requires warm-up) |
| Pricing | Free up to 3,000/mo, then $20/mo for 50K | Free up to 100/day | $0.10 per 1,000 |
| Template system | React Email (JSX templates) | Legacy editor | None built-in |
| Setup complexity | Low (DNS verification, 10 min) | Medium | High (sandbox escape, warm-up) |

Resend wins on developer experience and the ability to write email templates in React (same stack as the frontend). The free tier covers early launch needs.

### Notification Categories

#### Transactional Emails (always sent, no opt-out except account deletion)

| Email | Trigger | Priority |
|-------|---------|----------|
| Welcome email | Account creation | Immediate |
| Password reset | User requests reset | Immediate |
| Subscription confirmation | Stripe webhook: subscription created | Immediate |
| Subscription renewal reminder | 3 days before renewal date | Scheduled |
| Payment failed | Stripe webhook: payment failed | Immediate |

#### Engagement Emails (user can opt out per category)

| Email | Trigger | Default Schedule |
|-------|---------|-----------------|
| Morning kickstart | Daily at 7am user's local time | Opted in by default |
| Weekly dial summary | Sunday at 9am | Opted in by default |
| Streak at risk | No login by 8pm AND active streak > 3 days | Event-driven |
| Belt promotion | User achieves new belt level | Event-driven |
| Re-engagement | No login in 5+ days | Event-driven, max 1/week |

#### Web Push Notifications

| Notification | Trigger | Content |
|-------------|---------|---------|
| Streak reminder | No daily assessment by 6pm | "Your [X]-day streak is on the line. Take 2 minutes for today's check-in." |
| New content | Keith publishes new episode/resource | "New from Coach Keith: [title]" |
| Challenge update | Challenge deadline approaching | "Day 5 of 7 -- keep the momentum going." |
| Keith live event | Upcoming Man In The Arena event | "Keith is going live in 1 hour. Don't miss it." |

### Push Notification Implementation

The existing `sw.js` service worker will be extended to handle push events:

1. **Subscription**: on first login, prompt user to allow notifications. Store the push subscription object (endpoint + keys) in the user's profile.
2. **Sending**: API calls `web-push` npm library with the subscription and payload.
3. **Click handling**: service worker `notificationclick` event opens the relevant app page.
4. **Permission management**: if user denies permission, never prompt again. Show a settings toggle to re-enable.

### Opt-Out Management

User settings page includes per-category toggles:

```
Notifications
  [ ] Morning kickstart email (daily at 7am)
  [ ] Weekly dial summary (Sundays)
  [ ] Streak reminders (push + email)
  [ ] New content alerts (push)
  [ ] Keith live events (push + email)
```

Every email includes a one-click unsubscribe link (required by CAN-SPAM and Gmail guidelines). The unsubscribe link hits an API endpoint that disables that specific category for the user.

## Implementation

### NotificationService Architecture

```
src/services/notification.service.ts    -- orchestrator
src/services/email.service.ts           -- Resend client wrapper
src/services/push.service.ts            -- web-push client wrapper
src/templates/emails/                   -- React Email templates
src/jobs/notification-scheduler.ts      -- cron-based triggers
```

All notification sends are **queued** (BullMQ or simple in-memory queue at launch) to avoid blocking API responses. The coaching conversation endpoint should never wait for an email to send.

### Email Templates

Use React Email (`@react-email/components`) for all templates. This keeps templates in the same JSX/TSX ecosystem as the frontend and allows preview during development with `npx react-email dev`.

Templates follow Keith's brand: dark background, gold accents, Coach Keith's voice in copy.

### Scheduling

Use `node-cron` for scheduled jobs (morning kickstart, weekly summary). The scheduler runs inside the Cloud Run API container. For scale, move to Cloud Scheduler + Cloud Tasks (HTTP triggers to the API).

## Consequences

### Positive

- Users receive timely reminders that protect their streaks and maintain engagement
- Keith's voice extends beyond the chat interface into email and push notifications
- Transactional emails build trust (subscription confirmations, payment receipts)
- Web push works without a native app, leveraging the existing PWA service worker
- React Email templates are maintainable by the same frontend developers

### Negative

- Email deliverability requires DNS setup (SPF, DKIM, DMARC records for marriedgame.com)
- Push notification permission prompts can annoy users if shown too early
- Scheduling logic adds complexity (timezone handling, quiet hours, rate limiting)
- Over-notification risks: too many reminders can feel nagging rather than coaching

### Mitigations

- Delay push permission prompt until after the user completes their first assessment (proven engagement)
- Enforce quiet hours: no push notifications between 10pm and 7am user local time
- Rate limit: max 2 push notifications per day, max 1 engagement email per day
- Monitor unsubscribe rates weekly; if any category exceeds 5% unsubscribe rate, reduce frequency
