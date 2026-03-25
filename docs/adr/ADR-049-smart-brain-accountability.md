# ADR-049: Smart Brain Accountability -- Proactive Coaching Interventions

**Status:** Proposed
**Date:** 2026-03-24
**Related:** ADR-032 (Pi-Brain Persistence), ADR-035 (Admin Dashboard), ADR-037 (Belt Progression), ADR-041 (Email/Push Notifications)

---

## Context

Generic AI chatbots wait for the user to start a conversation. A real coach does the opposite -- when a client stops showing up or their numbers slide, the coach picks up the phone and says something. Today, Coach Keith AI only responds when spoken to. If a user quietly stops logging in or lets their dials decay week after week, the system does nothing. That silence is the opposite of what Keith Yackey's coaching brand stands for.

The Ruvector brain already tracks each user's Five Dials scores (individual dial values), leading score, and lagging score over time. By comparing the current week's data against a rolling 4-week window, the system can detect meaningful trends -- both negative slides and positive breakthroughs -- and trigger proactive interventions that match Keith's direct, no-nonsense coaching voice.

This is the core differentiator from every other AI coaching product: Keith does not wait to be asked. He holds you accountable like a real coach would.

---

## Decision

**Build an AccountabilityService that monitors user score trends, detects slacking or inactivity, and injects proactive Coach Keith messages into the chat -- including starting conversations before the user types anything.**

### Trigger Conditions

The service evaluates three categories of triggers after each assessment submission and on every login.

| Trigger | Condition | Severity |
|---------|-----------|----------|
| **Dial Drop** | Any individual dial drops by 2+ points compared to the previous 4-week average | Warning |
| **Lagging Stall** | Lagging score is 0 for 2+ consecutive weeks | Warning |
| **Missed Assessments** | User has missed 2+ weekly assessments in a row | Escalation |
| **Inactivity** | No login for 7+ days | Critical |
| **Dial Surge** | Any individual dial jumps 2+ points week-over-week | Celebration |

### Accountability Intervention Flow

When a trigger fires, the system generates a proactive message and queues it for delivery.

**Negative Triggers (Drop, Stall, Missed, Inactivity):**

1. The AccountabilityService creates a system-generated conversation entry tagged `proactive: true` and `mode: accountability`
2. On the user's next chat open, Coach Keith STARTS the conversation instead of showing the default greeting
3. The message is direct and specific -- it references the exact dial, the exact drop, and demands an explanation
4. Example: "Brother, I see your Partner dial dropped from 5 to 2 this week. What happened? Talk to me."
5. Example (inactivity): "Where the hell have you been? Your dials don't move themselves. Let's get back to work."

**Positive Triggers (Surge):**

1. Same mechanism, but tagged `mode: mentor`
2. Keith acknowledges the win: "I see you crushed the Player dial this week -- up 3 points. That's what I'm talking about. What changed?"
3. Celebration messages reinforce the behavior that drove the improvement

**Inactivity Push Notification:**

When a user has not logged in for 7+ days, the system also sends a push notification via the existing notification service (ADR-041). The notification text matches Keith's voice: "You've been quiet for a week. Your dials are waiting. Open the app."

### Tone Adaptation

The proactive message system uses two distinct tones depending on the trigger category.

| Mode | Tone | When Used |
|------|------|-----------|
| **Accountability** | Direct, confrontational, demanding answers | Dial drops, lagging stalls, missed assessments, inactivity |
| **Mentor** | Encouraging, proud, reinforcing | Dial surges, streak milestones |

The tone is controlled by appending the appropriate persona context to the AI prompt when generating the proactive message. The AI generates the actual message text -- it is not hardcoded -- but the system prompt steers the tone.

### Proactive Message Storage

Proactive messages are stored as conversation entries in the user's chat history with additional metadata: `proactive: true`, `trigger_type` (dial_drop, lagging_stall, missed_assessment, inactivity, dial_surge), `trigger_details` (dial name, previous/current values), `mode` (accountability or mentor), and `delivered_at` (null until the user sees it). Undelivered messages are shown in order when the user next opens the app.

### Frequency Limits

- Maximum 1 accountability intervention per user per day (even if multiple triggers fire, combine into one message)
- Maximum 1 celebration message per user per day
- If both accountability and celebration triggers fire on the same day, deliver both but accountability first
- Do not send push notifications more than once per 7-day inactivity window

---

## Implementation

```
src/services/accountability.service.ts   -- trend detection, trigger evaluation, message generation
src/models/proactive-message.model.ts    -- proactive message schema
```

### AccountabilityService API

- `evaluateAfterAssessment(userId) -> ProactiveMessage | null` -- called after each assessment submission
- `evaluateOnLogin(userId) -> ProactiveMessage[]` -- called on login, returns any queued proactive messages
- `getUndeliveredMessages(userId) -> ProactiveMessage[]` -- fetches pending proactive messages
- `markDelivered(messageId) -> void` -- marks a proactive message as seen

### Integration Points

- **AssessmentService**: calls `evaluateAfterAssessment` after saving new scores
- **AuthService**: calls `evaluateOnLogin` during the login flow
- **ChatService**: checks for undelivered proactive messages before rendering the chat, displays them as Keith's opening statement
- **NotificationService** (ADR-041): sends push notifications for inactivity triggers

---

## Consequences

### Positive

- Users feel genuinely coached, not just assisted -- Keith shows up when it matters most
- Proactive accountability reduces silent churn by re-engaging users before they fully disengage
- Celebration messages reinforce positive behavior loops and increase retention
- Every intervention references specific data (dial names, score changes), making it personal and credible
- Differentiates Coach Keith AI from generic chatbot products that only respond on command

### Negative

- Confrontational tone may not land well with all personality types (mitigation: allow users to adjust intervention intensity in settings -- "gentle" vs "direct")
- Push notifications risk being muted or causing opt-out if too aggressive (mitigation: frequency limits, respectful timing windows)
- Proactive messages add complexity to the chat rendering logic (mitigation: clear `proactive` flag separates them from normal conversation flow)

### Risks

- Users may feel surveilled if the AI references specific score changes unprompted (mitigation: onboarding explains that Coach Keith monitors your dials to keep you accountable)
- False positives from data entry errors could trigger unwarranted accountability messages (mitigation: require 2+ data points before triggering, ignore single-week anomalies for dial drops)
