# Coach Keith AI -- Domain-Driven Design Context Map

## Overview

The Coach Keith AI mobile app is decomposed into **eight bounded contexts**, each owning a distinct slice of the domain. This document defines every context, its responsibilities, and the relationships (integration patterns) between them.

---

## Bounded Contexts

| # | Context | Core Responsibility |
|---|---------|---------------------|
| 1 | **Coaching** | AI-powered conversational coaching via Claude API, conversation management, crisis detection, framework-guided sessions |
| 2 | **Identity** | User registration, authentication, profile, onboarding, preferences, privacy/data management |
| 3 | **Assessment** | Five Dials scoring, marriage-health reports, trends, micro-challenges |
| 4 | **Engagement** | Daily engagement loops, streaks, notifications, habit formation, gamification |
| 5 | **Content** | Podcast library (88 episodes), ebook, curated content, search & recommendations |
| 6 | **Community** | Brotherhood groups, peer interaction, anonymity controls, moderation |
| 7 | **Subscription** | Billing, plans, trials, payment processing, entitlements, receipts |
| 8 | **LiveEvents** | Live coaching events, webinars, scheduling, replays, event-specific chat |

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
 +--------------+  CS +---------+----+ CS  +--------------+
        |                |      |                |
        | ACL            | P    | CS             | CS
        v                v      v                v
 +--------------+  +-----------+ +----------+ +-----------+
 | LIVE EVENTS  |  | CONTENT   | |ASSESSMENT| | COMMUNITY |
 |              |  | (upstream) | |(upstream)| |           |
 +--------------+  +-----------+ +----------+ +-----------+

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

---

## Shared Kernel

There is **no shared kernel** between contexts. All integration is via published events, REST/gRPC APIs, or anti-corruption layers. Each context owns its own persistence and data model.

---

## Event Flow Summary

| Source Context | Event | Consumer(s) |
|---------------|-------|-------------|
| Identity | `UserRegistered` | Coaching, Engagement, Subscription |
| Identity | `OnboardingCompleted` | Coaching, Assessment |
| Identity | `ProfileUpdated` | Coaching |
| Coaching | `ConversationStarted` | Engagement |
| Coaching | `MessageSent` | Engagement |
| Coaching | `CrisisDetected` | Engagement (escalation alert) |
| Coaching | `DialAdjustmentSuggested` | Assessment |
| Assessment | `FiveDialsAssessmentCompleted` | Coaching, Engagement |
| Assessment | `MicroChallengeAssigned` | Engagement |
| Assessment | `MicroChallengeCompleted` | Engagement, Coaching |
| Assessment | `SignificantDialImprovement` | Community (celebration) |
| Engagement | `StreakMilestoneReached` | Community |
| Engagement | `DailyEngagementCompleted` | Coaching (context) |
| Subscription | `SubscriptionActivated` | All contexts (entitlement gate) |
| Subscription | `SubscriptionCanceled` | All contexts |
| LiveEvents | `EventScheduled` | Engagement (notification) |
| Content | `NewEpisodePublished` | Engagement (notification), Coaching (RAG update) |
| Community | `BrotherhoodPostCreated` | Engagement |

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
| Coach Keith | Coaching | The AI persona powered by Claude API |
| Dial Adjustment | Assessment, Coaching | AI-suggested change to a user's dial score based on conversation signals |
