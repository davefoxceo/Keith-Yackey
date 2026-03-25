# Coach Keith AI -- Domain-Driven Design Context Map

## Overview

The Coach Keith AI mobile app is decomposed into **twelve bounded contexts**, each owning a distinct slice of the domain. This document defines every context, its responsibilities, and the relationships (integration patterns) between them.

---

## Bounded Contexts

| # | Context | Core Responsibility |
|---|---------|---------------------|
| 1 | **Coaching** | AI-powered conversational coaching via Claude API, conversation management, crisis detection, framework-guided sessions |
| 2 | **Identity** | User registration, authentication, profile, onboarding, preferences, privacy/data management |
| 3 | **Assessment** | Five Dials scoring, marriage-health reports, trends, micro-challenges |
| 4 | **Engagement** | Daily engagement loops, streaks, notifications, habit formation |
| 5 | **Content** | Podcast library (88 episodes), ebook, curated content, search & recommendations |
| 6 | **Community** | Brotherhood groups, peer interaction, anonymity controls, moderation |
| 7 | **Subscription** | Billing, plans, trials, payment processing, entitlements, receipts |
| 8 | **LiveEvents** | Live coaching events, webinars, scheduling, replays, event-specific chat |
| 9 | **Gamification** | Belt progression (White-Black), leaderboard rankings, milestones, referral rewards |
| 10 | **Accountability** | Smart brain accountability, proactive Keith interventions, individualized challenges, score trend monitoring |
| 11 | **Admin** | Keith's admin dashboard, call prep, client grading, analytics, risk monitoring |
| 12 | **Voice** | Voice mode with Keith's cloned voice, speech-to-text, text-to-speech, real-time voice sessions |

---

## Context Map Diagram

```
 +---------------------------------------------------------------------+
 |                        COACH KEITH AI PLATFORM                       |
 +---------------------------------------------------------------------+

                          +--------------+
                          |  IDENTITY    |
                          |  (upstream)  |
                          +------+-------+
                                 |
              Conformist         |         Conformist
        +--------------------+   |   +--------------------+
        |                    |   |   |                    |
        v                    v   v   v                    v
 +--------------+     +--------------+     +--------------+
 | SUBSCRIPTION |     |   COACHING   |     |  ENGAGEMENT  |
 |              |<----|  (core)      |---->|              |
 +--------------+  CS +---------+----+ CS  +------+-------+
        |                |      |                 |
        | ACL            | P    | CS              | CS
        v                v      v                 v
 +--------------+  +-----------+ +----------+ +-----------+
 | LIVE EVENTS  |  | CONTENT   | |ASSESSMENT| | COMMUNITY |
 |              |  | (upstream) | |(upstream)| |           |
 +--------------+  +-----------+ +----+-----+ +-----------+
                                      |
                          CS          |          CS
                   +------------------+------------------+
                   |                                     |
                   v                                     v
            +--------------+                    +--------------+
            | GAMIFICATION |                    |ACCOUNTABILITY|
            | (downstream) |                    |   (core)     |
            +--------------+                    +--------------+
                                                      |
                                                      | CS (intervention channel)
                                                      v
                                                +--------------+
            +--------------+                    |    VOICE     |
            |    ADMIN     |<--- ACL (all) -----|  (channel)   |
            | (read-only)  |                    +--------------+
            +--------------+

 Legend:
   ---->  Direction of dependency (arrow points to downstream)
   CS   = Customer-Supplier
   P    = Partnership
   ACL  = Anti-Corruption Layer
   Conformist = Downstream conforms to upstream model
```

---

## Relationship Definitions

### 1. Identity --> Coaching (Conformist)

The Coaching context **conforms** to Identity's user model. When Coaching needs user data (name, marriage stage, preferences), it accepts Identity's published `UserProfile` shape without translation. Identity is the single source of truth for who the user is.

- **Direction:** Identity is upstream; Coaching is downstream.
- **Pattern:** Conformist -- Coaching uses Identity's published language directly.

### 2. Identity --> Engagement (Conformist)

Engagement conforms to Identity's user and preference models. Notification schedules, time zones, and engagement preferences originate in Identity.

- **Direction:** Identity upstream; Engagement downstream.
- **Pattern:** Conformist.

### 3. Identity --> Subscription (Conformist)

Subscription links billing entities to Identity's `UserId`. It conforms to the user model without redefining it.

- **Direction:** Identity upstream; Subscription downstream.
- **Pattern:** Conformist.

### 4. Coaching --> Assessment (Customer-Supplier)

Coaching is the **customer**; Assessment is the **supplier**. Coaching requests the latest Five Dials scores and marriage-health data to personalize AI responses. Assessment exposes a read-only query interface.

- **Direction:** Assessment supplies data to Coaching.
- **Pattern:** Customer-Supplier -- Coaching specifies what it needs; Assessment agrees to provide it.

### 5. Coaching --> Content (Partnership)

Coaching and Content operate as **partners**. The AI coach recommends podcast episodes and ebook sections during conversations, and Content provides RAG-ready metadata and transcripts. Both teams collaborate on the content-recommendation protocol.

- **Direction:** Bidirectional collaboration.
- **Pattern:** Partnership -- shared integration protocol, co-owned contract.

### 6. Coaching --> Engagement (Customer-Supplier)

Coaching publishes domain events (`ConversationStarted`, `MessageSent`) that Engagement consumes to update streaks and daily-engagement tracking. Coaching is the supplier of activity signals; Engagement is the customer.

- **Direction:** Coaching supplies events; Engagement consumes.
- **Pattern:** Customer-Supplier.

### 7. Coaching --> Community (Customer-Supplier)

Community consumes coaching-derived insights (anonymized progress data, suggested discussion topics). Coaching supplies; Community consumes.

- **Direction:** Coaching upstream; Community downstream.
- **Pattern:** Customer-Supplier.

### 8. Assessment --> Engagement (Customer-Supplier)

Assessment publishes events like `MicroChallengeAssigned` and `FiveDialsAssessmentCompleted`. Engagement consumes these to trigger notifications and update engagement metrics.

- **Direction:** Assessment upstream; Engagement downstream.
- **Pattern:** Customer-Supplier.

### 9. Subscription --> LiveEvents (Anti-Corruption Layer)

LiveEvents needs to verify entitlements before granting event access. It does **not** conform to Subscription's internal billing model. Instead, LiveEvents wraps Subscription behind an **Anti-Corruption Layer** that translates entitlement checks into its own domain language (`EventAccess`, `TicketEntitlement`).

- **Direction:** Subscription upstream; LiveEvents downstream.
- **Pattern:** Anti-Corruption Layer.

### 10. Content --> Coaching (Partnership)

Content provides transcript embeddings and metadata for RAG retrieval. Coaching provides usage analytics back to Content (which episodes are most recommended, completion rates). This is a co-owned, bidirectional contract.

- **Direction:** Bidirectional.
- **Pattern:** Partnership (same relationship as #5, listed from Content's perspective).

### 11. Engagement --> Community (Customer-Supplier)

Community uses engagement signals (streak data, active-days count) to rank and surface active Brotherhood members. Engagement supplies; Community consumes.

- **Direction:** Engagement upstream; Community downstream.
- **Pattern:** Customer-Supplier.

### 12. Assessment --> Gamification (Customer-Supplier)

Gamification consumes dial scores, composite scores, and challenge completion data from Assessment to calculate belt progression and leaderboard rankings. Assessment is unaware of belts or leaderboards.

- **Direction:** Assessment upstream; Gamification downstream.
- **Pattern:** Customer-Supplier -- Gamification defines what score data it needs; Assessment supplies it.

### 13. Assessment + Coaching --> Accountability (Customer-Supplier)

Accountability consumes score trends from Assessment and session activity from Coaching to determine when proactive interventions are warranted. Both Assessment and Coaching are upstream suppliers; Accountability is the downstream customer that synthesizes their signals.

- **Direction:** Assessment and Coaching upstream; Accountability downstream.
- **Pattern:** Customer-Supplier -- Accountability defines the triggers; upstream contexts supply the raw data.

### 14. All Contexts --> Admin (Anti-Corruption Layer)

Admin is a **read-only terminal consumer** of all other bounded contexts. It translates upstream models into its own read-optimized projections (ClientOverview, DashboardMetrics, CallPrepReport). Admin never writes back to upstream contexts.

- **Direction:** All contexts upstream; Admin downstream.
- **Pattern:** Anti-Corruption Layer -- Admin shields itself from upstream model changes via translation services.

### 15. Coaching <--> Voice (Channel Adapter)

Voice is a **channel adapter** for the Coaching context. It handles audio I/O (STT via Whisper, TTS via ElevenLabs) but delegates all AI reasoning to Coaching. Voice transcribes user speech into text, passes it to Coaching's existing pipeline, and synthesizes the text response back to audio using Keith's cloned voice.

- **Direction:** Voice wraps Coaching; bidirectional data flow.
- **Pattern:** Channel Adapter -- same domain logic, different I/O modality.

### 16. Accountability --> Voice (Customer-Supplier)

Voice serves as a delivery channel for Accountability's proactive interventions. When Keith needs to reach out via voice, Accountability publishes an intervention event that Voice consumes to initiate an outbound voice session.

- **Direction:** Accountability upstream (trigger); Voice downstream (delivery).
- **Pattern:** Customer-Supplier.

---

## Shared Kernel

**Internationalization (i18n)** is a shared kernel concern that cuts across all contexts. It is not a bounded context of its own but rather a cross-cutting infrastructure library that provides locale-aware formatting, translation keys, and content localization. All contexts depend on the shared i18n module for user-facing strings, date/time formatting, and number formatting.

All other integration is via published events, REST/gRPC APIs, or anti-corruption layers. Each context owns its own persistence and data model.

---

## Event Flow Summary

| Source Context | Event | Consumer(s) |
|---------------|-------|-------------|
| Identity | `UserRegistered` | Coaching, Engagement, Subscription |
| Identity | `OnboardingCompleted` | Coaching, Assessment |
| Identity | `ProfileUpdated` | Coaching |
| Coaching | `ConversationStarted` | Engagement |
| Coaching | `MessageSent` | Engagement |
| Coaching | `CrisisDetected` | Engagement (escalation alert), Admin (red alert) |
| Coaching | `DialAdjustmentSuggested` | Assessment |
| Assessment | `FiveDialsAssessmentCompleted` | Coaching, Engagement, Gamification, Accountability |
| Assessment | `MicroChallengeAssigned` | Engagement |
| Assessment | `MicroChallengeCompleted` | Engagement, Coaching |
| Assessment | `SignificantDialImprovement` | Community (celebration), Gamification |
| Assessment | `DialScoreChanged` | Accountability (trend monitoring) |
| Engagement | `StreakMilestoneReached` | Community, Gamification |
| Engagement | `StreakBroken` | Accountability (intervention trigger) |
| Engagement | `DailyEngagementCompleted` | Coaching (context) |
| Subscription | `SubscriptionActivated` | All contexts (entitlement gate) |
| Subscription | `SubscriptionCanceled` | All contexts |
| LiveEvents | `EventScheduled` | Engagement (notification) |
| Content | `NewEpisodePublished` | Engagement (notification), Coaching (RAG update) |
| Community | `BrotherhoodPostCreated` | Engagement |
| Gamification | `BeltPromoted` | Coaching (tone adjustment), Community (celebration), Admin |
| Gamification | `LeaderboardUpdated` | Community |
| Gamification | `ReferralConverted` | Subscription (credit), Admin |
| Accountability | `InterventionTriggered` | Coaching (next session context), Voice (delivery), Admin |
| Accountability | `ChallengeAssigned` | Engagement |
| Accountability | `ScoreDeclined` | Admin (risk monitoring) |
| Voice | `VoiceSessionStarted` | Engagement (counts as engagement) |
| Voice | `VoiceSessionEnded` | Coaching (session analytics), Admin |
| Admin | `CallPrepGenerated` | (internal -- no downstream consumers) |
| Admin | `RedAlertTriggered` | (internal -- notification to Keith) |

---

## Integration Patterns by Context

| Context | Publishes Events | Consumes Events | Exposes API | Calls API |
|---------|-----------------|-----------------|-------------|-----------|
| Identity | Yes | No | REST (profile, prefs) | None |
| Coaching | Yes | Yes | REST/WebSocket | Identity, Assessment, Content |
| Assessment | Yes | Yes | REST (scores, reports) | Identity |
| Engagement | Yes | Yes | REST (streaks, stats) | Identity |
| Content | Yes | No | REST/Search | None |
| Community | Yes | Yes | REST | Identity, Engagement |
| Subscription | Yes | Yes | REST (entitlements) | Identity, Payment Gateway |
| LiveEvents | Yes | Yes | REST | Subscription (via ACL) |
| Gamification | Yes | Yes | REST (belts, leaderboard) | Assessment, Engagement |
| Accountability | Yes | Yes | REST (interventions) | Assessment, Coaching, Engagement |
| Admin | Yes (internal) | Yes | REST (dashboard, reports) | All contexts (via ACL) |
| Voice | Yes | Yes | WebSocket (streaming) | Coaching, ElevenLabs, Whisper |

---

## Anti-Corruption Layer Details

### LiveEvents <-- ACL --> Subscription

The ACL translates between Subscription's billing-centric model and LiveEvents' access-centric model:

```typescript
// Subscription's model (upstream)
interface SubscriptionEntitlement {
  userId: string;
  planId: string;
  status: 'active' | 'past_due' | 'canceled';
  features: string[];
}

// LiveEvents' model (downstream, behind ACL)
interface EventAccessGrant {
  userId: string;
  canAccessLiveEvents: boolean;
  canAccessReplays: boolean;
  maxConcurrentStreams: number;
}

// ACL translation service
class SubscriptionACL {
  translateToEventAccess(entitlement: SubscriptionEntitlement): EventAccessGrant {
    return {
      userId: entitlement.userId,
      canAccessLiveEvents: entitlement.status === 'active'
        && entitlement.features.includes('live_events'),
      canAccessReplays: entitlement.status === 'active',
      maxConcurrentStreams: entitlement.features.includes('premium') ? 3 : 1,
    };
  }
}
```

### Admin <-- ACL --> All Contexts

Admin's ACL translates upstream domain models into read-optimized projections:

```typescript
// Admin's translation layer
class AdminProjectionService {
  /** Translates Assessment + Engagement + Coaching data into a ClientOverview */
  projectClientOverview(
    profile: IdentityUserProfile,
    assessment: AssessmentSnapshot,
    engagement: EngagementSnapshot,
    gamification: GamificationSnapshot
  ): ClientOverview {
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      grade: this.calculateGrade(assessment, engagement),
      belt: gamification.currentBelt,
      currentDialScores: assessment.dialScores,
      compositeScore: assessment.compositeScore,
      riskLevel: this.assessRisk(assessment, engagement),
      lastActive: engagement.lastEngagementDate,
      streakDays: engagement.currentStreak,
      subscriptionStatus: profile.subscriptionStatus,
      joinedAt: profile.createdAt,
    };
  }
}
```

---

## Ubiquitous Language (Cross-Context Glossary)

| Term | Context | Meaning |
|------|---------|---------|
| Five Dials | Assessment | The five life dimensions scored: Parent, Partner, Producer, Player, Power |
| Brotherhood | Community | The peer-support community of men in the app |
| Marriage Stage | Identity, Coaching | Classification of where a man's marriage currently stands |
| Streak | Engagement | Consecutive days of app engagement |
| Micro-Challenge | Assessment | A small, actionable task assigned after dial assessment |
| RAG Context | Coaching | Retrieval-Augmented Generation data fed to the AI coach |
| Coach Keith | Coaching, Voice | The AI persona powered by Claude API (text or voice) |
| Dial Adjustment | Assessment, Coaching | AI-suggested change to a user's dial score based on conversation signals |
| Belt | Gamification | A progression rank (White through Black) earned through sustained improvement |
| Composite Score | Gamification | A weighted score combining leading score, streak, belt level, and consistency |
| Proactive Intervention | Accountability | An unprompted outreach from Keith triggered by declining scores or inactivity |
| Client Grade | Admin | A letter grade (A-F) summarizing a client's overall engagement and progress |
| Call Prep | Admin | An auto-generated briefing document for Keith's scheduled coaching calls |
| Voice Session | Voice | A real-time audio conversation using Keith's cloned voice |
| i18n | Shared Kernel | Internationalization -- cross-cutting locale and translation support |
