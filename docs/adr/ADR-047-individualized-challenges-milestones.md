# ADR-047: Individualized Challenges and Dynamic Milestones

**Status:** Proposed
**Date:** 2026-03-24

## Context

The Coach Keith AI app currently has 4 hardcoded milestones (first assessment, first conversation, 7-day streak, 30-day streak) and a static weekly challenge system. Every user sees the same milestones regardless of where they are in their journey, and challenges do not adapt to individual circumstances. A man struggling with his Partner dial gets the same challenge as a man whose Faith dial is lagging.

Keith's real coaching is intensely personal. He gives each man specific actions based on what that man is going through right now. The AI has access to all the signals needed to replicate this: Five Dials scores, conversation history, belt level, streak status, and score trends over time. The app should use this context to generate daily micro-actions and weekly challenges that feel like Keith looked at your specific situation and told you exactly what to do today.

## Decision

Build a **ChallengeService** that uses Claude to generate personalized daily actions and weekly challenges based on each user's context, and expand the milestone system from 4 static achievements to a dynamic, growing set of unlockable milestones.

### Daily Micro-Actions (3 Per Day)

Each morning at 5am in the user's local timezone, the system generates 3 specific, actionable tasks:

| Input Signal | Example Output |
|-------------|----------------|
| Low Partner dial (score 2/7 this week) | "Text your wife something you appreciate about her before noon" |
| Low Faith dial + Sunday | "Spend 10 minutes in prayer or meditation before the day gets going" |
| Low Fitness dial + high streak (showing up mentally but not physically) | "Do 25 pushups right now -- set the phone down and go" |
| High Business dial + low Partner dial | "You're crushing it at work. Leave the office 30 minutes early today and be fully present at home" |
| Recent conversation about anger management | "When you feel frustrated today, take 3 breaths before responding. Just 3." |

Generation rules:
- Actions must be completable in under 15 minutes
- Actions must be specific (not "be a better husband" but "write down 3 things your wife did this week that you're grateful for")
- No repeated actions within 7 days
- At least one action per day tied to the user's lowest-scoring dial
- Actions difficulty scales with belt level (White belt gets simpler actions, Black belt gets harder ones)

### Weekly Challenges

One challenge assigned every Monday, focused on the user's area of greatest need:

| Lowest Dial | Example Challenge | Duration |
|-------------|------------------|----------|
| **Partner** | "Plan a date night this week -- no phones, no kids. Send Keith a photo." | 7 days |
| **Faith** | "Read one chapter of a book on faith or purpose every day this week" | 7 days |
| **Fitness** | "Work out 5 of the next 7 days -- any workout counts, but you have to break a sweat" | 7 days |
| **Fatherhood** | "Have a one-on-one conversation with each of your kids this week -- ask them about their world" | 7 days |
| **Business** | "Identify the one task you've been avoiding at work and do it by Wednesday" | 7 days |

Weekly challenges are more ambitious than daily actions and designed to create a measurable shift in the target dial by the next assessment.

### AI Generation Pipeline

```
User context collected:
  - Current Five Dials scores (this week + last 4 weeks trend)
  - Recent conversation topics (last 5 conversations summarized)
  - Current belt level
  - Active streak length
  - Leading/lagging score trends
  - Previously assigned actions (last 14 days)
  - Previously completed vs skipped actions
       |
       v
ChallengeService calls Claude with structured prompt:
  "You are Coach Keith. Based on this user's situation, generate 3 daily actions..."
       |
       v
Claude returns structured JSON with actions, rationale, and target dial
       |
       v
Actions stored in DataStore, pushed to user via notification at 5am local time
```

The prompt includes the list of recently assigned actions to prevent repetition. Claude is instructed to vary its approach -- if a user has been getting "text your wife" actions and not completing them, try a different angle on the Partner dial.

### Challenge Completion Tracking

- Daily actions: user taps a checkmark button in the app to mark complete
- Weekly challenges: user marks complete with optional photo or text reflection
- Completion is self-reported (honor system, consistent with Keith's coaching philosophy)
- Completion rates tracked per user and per dial to inform future action generation
- If a user completes fewer than 30% of actions for 2 consecutive weeks, reduce from 3 to 2 daily actions to prevent overwhelm

### Dynamic Milestone System

Milestones expand from 4 static achievements to a comprehensive system across 6 categories:

#### Score Milestones
- First 25/35 leading score
- First 30/35 leading score
- Perfect 35/35 week
- 4 consecutive weeks above 25

#### Streak Milestones
- 7-day streak
- 14-day streak
- 30-day streak
- 60-day streak
- 90-day streak
- 180-day streak
- 365-day streak (one full year)

#### Conversation Milestones
- 10 conversations with Coach Keith
- 50 conversations
- 100 conversations

#### Dial Improvement Milestones
- Improved any single dial by 3 points in a month
- All 5 dials at 5+ in the same week
- Maintained all dials at 4+ for 4 consecutive weeks

#### Belt Milestones
- Each new belt earned (White through Black, 10 total)

#### Challenge Milestones
- 5 daily actions completed
- 10 daily actions completed
- 25 daily actions completed
- 5 weekly challenges completed
- 10 weekly challenges completed
- 25 weekly challenges completed

Total: approximately 35-40 milestones, with room to add more as the platform grows.

Each milestone triggers a congratulatory message from Coach Keith AI in the user's next conversation, a badge on their profile, and belt XP (ADR-037).

## Implementation

```
src/services/challenge.service.ts      -- AI-powered action and challenge generation
src/services/milestone.service.ts      -- milestone tracking and achievement detection
src/models/challenge.model.ts          -- action, challenge, and completion types
src/models/milestone.model.ts          -- milestone definitions and user progress
```

### ChallengeService API

- `generateDailyActions(userId) -> DailyAction[]` -- generates 3 personalized actions
- `generateWeeklyChallenge(userId) -> WeeklyChallenge` -- generates weekly challenge
- `completeAction(userId, actionId) -> void` -- marks action complete
- `completeChallenge(userId, challengeId, reflection?) -> void` -- marks challenge complete
- `getActiveActions(userId) -> DailyAction[]` -- returns today's actions with status
- `getActiveChallenge(userId) -> WeeklyChallenge` -- returns current week's challenge

### MilestoneService API

- `checkMilestones(userId) -> Milestone[]` -- evaluates all milestone criteria, returns newly earned
- `getMilestoneProgress(userId) -> MilestoneProgress[]` -- returns all milestones with completion status
- `getRecentAchievements(userId, days?) -> Milestone[]` -- milestones earned in last N days

## Consequences

### Positive

- Daily actions give users a concrete "what to do today" that replaces vague self-improvement goals
- Personalization makes the app feel like having a real coach who knows your situation
- Dynamic milestones provide a long progression path that keeps users engaged for months
- Challenge completion data feeds back into the AI, making future actions more relevant
- Difficulty scaling by belt level prevents overwhelm for beginners and boredom for veterans

### Negative

- Claude API cost for daily generation across all users (3 actions per user per day)
- Self-reported completion has no verification -- users may check off without doing the action
- Poor AI-generated actions could feel generic or miss the mark, reducing trust
- Notification fatigue if users feel pressured by daily action reminders

### Mitigations

- Batch generation: generate actions for all users in a single scheduled job at 4am UTC, using Claude's batch API for cost efficiency
- Quality guardrails: actions are generated with structured output (JSON schema) and validated before storage -- reject any action over 280 characters or missing a specific verb
- User feedback: thumbs up/down on each action, fed back into future generation prompts
- Notification preferences: users can choose morning notification, evening digest, or no notifications (actions still visible in app)
