# ADR-035: Admin Dashboard for Client Management

**Status:** Proposed
**Date:** 2026-03-24
**Related:** ADR-034 (Stripe Payments), ADR-037 (Belt Progression), ADR-032 (Pi-Brain Persistence)

---

## Context

Keith needs visibility into his client base to run his coaching business effectively. Today he has no way to see which clients are thriving, which are dropping off, how much revenue the app generates, or what a specific client has been discussing with the AI before a scheduled call. A dedicated admin dashboard solves this by giving Keith a single place to monitor, triage, and prepare for client interactions.

The admin dashboard is not a separate app. It lives inside the existing web app behind role-based access, keeping deployment and authentication simple.

---

## Decision

**Build an admin dashboard as a protected route group within the existing web app, accessible only to users with the `admin` role, featuring client grading, revenue metrics, and conversation review.**

### Route Structure

All admin routes live under `/admin/*` and are protected by an `AdminGuard` that checks the user's role before rendering.

| Route | View | Purpose |
|-------|------|---------|
| `/admin` | Overview dashboard | High-level KPIs: total users, MRR, active trials, avg grade |
| `/admin/clients` | Client list | Sortable table of all users with grade, belt, tier, last active |
| `/admin/clients/:id` | Client detail | Individual user: scores, streaks, belt, conversation history, subscription info |
| `/admin/revenue` | Revenue metrics | MRR, churn rate, tier distribution, trial conversion rate |
| `/admin/engagement` | Engagement metrics | DAU/WAU, chat sessions per user, assessment completion rates |
| `/admin/content` | Content management | Upload new coaching content, view ingestion pipeline status (ADR-038) |

### Role-Based Access

- The `role` field is stored on the user record in DataStore (`role: 'user' | 'admin'`)
- Keith's account is seeded as `admin` during initial setup
- The `AdminGuard` on the backend rejects any API call from a non-admin user with 403
- The frontend hides the admin navigation link for non-admin users but the real enforcement is server-side

### Client Grading Algorithm

Every client receives a letter grade calculated weekly. This gives Keith an instant read on who needs attention.

| Grade | Criteria |
|-------|----------|
| **A** | 6+ day streak, avg leading score 25+, 3+ chat sessions/week |
| **B** | 4+ day streak, avg leading score 18+, 2+ chat sessions/week |
| **C** | 2+ day streak, avg leading score 12+, 1+ chat session/week |
| **D** | 1 day streak or avg leading score 6+, sporadic chat usage |
| **F** | No activity in 7+ days |

The algorithm weights these inputs:

```
grade_score = (streak_consistency * 0.35) + (avg_leading_score_normalized * 0.35) + (chat_frequency_normalized * 0.30)
```

Thresholds: A >= 85, B >= 70, C >= 50, D >= 25, F < 25.

### Red Alert System

When a client drops below C grade (grade_score < 50), the system:

1. Flags the client row red in the admin client list
2. Sends a push notification to Keith (if notifications are enabled)
3. Adds the client to a "Needs Attention" section at the top of the dashboard
4. Logs the alert event for tracking re-engagement patterns

This ensures no paying client silently churns without Keith having a chance to intervene.

### Conversation Review

Keith can view any client's full conversation history from the client detail page. This is critical for call prep -- before a 1-on-1 with an Elite client, Keith reads the recent AI conversations to understand what the client is working on, what they are struggling with, and what advice the AI has already given.

Conversations are displayed in chronological order with timestamps, mode labels (Coach/Mentor/Accountability/Crisis), and any flagged messages.

---

## Implementation

### Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Aggregate KPIs (user count, MRR, avg grade) |
| GET | `/admin/clients` | Paginated client list with filters and sort |
| GET | `/admin/clients/:id` | Full client profile with scores, belt, history |
| GET | `/admin/clients/:id/conversations` | Paginated conversation history for a client |
| GET | `/admin/revenue` | Revenue metrics (MRR, churn, conversions) |
| GET | `/admin/engagement` | Engagement metrics (DAU, WAU, session counts) |
| POST | `/admin/content/upload` | Manual content ingestion (ADR-038) |

All endpoints use the `@AdminOnly()` decorator which applies the `AdminGuard`.

### Frontend

- Built with the same React + shadcn/ui stack as the rest of the app
- Data tables use `@tanstack/react-table` for sorting, filtering, pagination
- Charts use the same Recharts library already in the project
- Grade badges are color-coded: A=green, B=blue, C=yellow, D=orange, F=red

---

## Consequences

### Positive

- Keith gets full visibility into client health without manual tracking
- Red alerts prevent silent churn by surfacing at-risk clients early
- Conversation review makes 1-on-1 calls significantly more productive
- Revenue and engagement views replace guesswork with data
- Single codebase deployment (no separate admin app to maintain)

### Negative

- Admin routes increase the attack surface (mitigation: server-side role checks on every endpoint)
- Grading algorithm needs tuning over time as usage patterns emerge
- Conversation review raises privacy considerations (mitigation: terms of service disclose AI conversations may be reviewed by coach)
- Additional frontend pages increase bundle size (mitigation: code-split admin routes, lazy load)

### Risks

- Keith could become overwhelmed by alerts if many clients drop off simultaneously (mitigation: batch alerts into a daily digest)
- Grading thresholds may not match Keith's intuition initially (mitigation: make thresholds configurable from admin settings)

---

## Enhanced Admin Views (Post-Demo Feedback)

The following enhancements extend the admin dashboard based on coaching workflow feedback. The goal is to give Keith ONE screen that shows him everything he needs to run his business and prepare for client interactions.

### Single-Dashboard Summary (`/admin`)

The overview dashboard is expanded to show all critical KPIs in a single view without navigation:

| Widget | Data | Source |
|--------|------|--------|
| Total Active Users | Count of users with activity in the last 14 days | UserService |
| MRR | Current monthly recurring revenue | Stripe (ADR-034) |
| Average Leading Score | Mean leading score across all active users | AssessmentService |
| Users At Risk | Count and list of users with grade C or below | GradingService |
| Upcoming Call Prep | Next scheduled call with client count and red flag count | CallPrepService (ADR-050) |
| Referral Activity | New referrals this week, pending invites, top referrer | ReferralService (ADR-044) |
| Belt Distribution Chart | Bar chart showing user count per belt level | BeltService (ADR-037) |

### Call Prep View

A dedicated admin section for pre-call client briefings. See ADR-050 for full specification. The admin sidebar links to `/admin/calls` with a red alert badge when any client on today's calls has a grade below C.

### User Drill-Down (`/admin/clients/:id`)

The existing client detail page is enhanced with deep-dive capabilities:

- **Dial History Chart**: line chart showing all 5 dials over time (4-week, 12-week, all-time toggles)
- **Conversation Log**: full chat history with mode labels, searchable by keyword and date range
- **Challenges Completed**: list of completed and in-progress challenges with dates and outcomes
- **Referrals Made**: users this client referred, their current status, and any earned rewards (ADR-044)
- **Payment History**: subscription tier changes, payment dates, failed charges, refunds (ADR-034)

### Engagement Heatmap (`/admin/engagement`)

A visual heatmap (7 columns for days, 24 rows for hours) showing when users are most active across the platform. Cell intensity represents session count. This helps Keith understand usage patterns and schedule calls or content drops at peak engagement times.

### Content Performance (`/admin/content`)

Extends the existing content management view with analytics on which RAG content entries are being referenced most frequently in AI responses. Table columns: content title, reference count (last 30 days), unique users served, average conversation rating when content was cited. Helps Keith prioritize content creation and identify gaps.

### Cross-References

- ADR-044: Referral leaderboard data feeds into the dashboard summary and user drill-down
- ADR-046: Leaderboard data powers the belt distribution chart and engagement metrics
- ADR-049: Accountability alerts surface in the "Users At Risk" widget and user drill-down red flags
- ADR-050: Call prep reports are accessible directly from the dashboard and the dedicated calls view
