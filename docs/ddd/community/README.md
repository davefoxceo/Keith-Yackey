# Community Bounded Context

## Overview

The Community Context manages the Brotherhood -- Coach Keith's peer community where men support each other through their marriage improvement journey. It handles posts, moderation, voting, and accountability partnerships. The Brotherhood is a safe, moderated space where vulnerability is encouraged and toxicity is actively filtered.

**Core Responsibilities:**
- Manage Brotherhood posts (create, moderate, display)
- AI-assisted content moderation to maintain a safe, constructive environment
- Upvoting and pinning mechanics for surfacing valuable contributions
- Accountability partnerships between pairs of users
- Shared commitments between accountability partners
- Anonymous posting option for sensitive topics

**Upstream Dependencies:** Identity Context (user profiles, subscription tier for access gating), Engagement Context (milestones shared to community), Subscription Context (Brotherhood access requires active subscription)

**Downstream Consumers:** Engagement Context (community activity counts toward milestones), Coaching Context (partner dynamics may inform coaching)

---

## Aggregates

### BrotherhoodPost

The BrotherhoodPost aggregate represents a single post in the Brotherhood community feed, including its comments and moderation state.

```typescript
interface BrotherhoodPost {
  readonly id: string;
  readonly authorIdentity: AuthorIdentity;
  readonly createdAt: Timestamp;
  content: PostContent;
  moderationStatus: ModerationStatus;
  moderationDecision: ModerationDecision | null;
  comments: PostComment[];
  voteCount: VoteCount;
  isPinned: boolean;
  pinnedAt: Timestamp | null;
  pinnedBy: UserId | null;
  isRemoved: boolean;
  removedAt: Timestamp | null;
  removedReason: string | null;

  moderate(decision: ModerationDecision): PostModerated;
  addComment(comment: PostComment): void;
  upvote(userId: UserId): PostUpvoted;
  removeUpvote(userId: UserId): void;
  pin(pinnedBy: UserId): PostPinned;
  unpin(): void;
  remove(reason: string, removedBy: UserId): PostRemoved;
}
```

**Invariants:**
- A post must pass moderation before it is visible to other users
- A user cannot upvote their own post
- A user can only upvote a post once (idempotent)
- Removed posts cannot receive new comments or votes
- Pinned posts must have passed moderation
- Maximum 5 pinned posts at any time (enforced at service level)
- Comments on a post are limited to 100 (to prevent runaway threads)
- Post content cannot be edited after moderation is complete
- Anonymous posts cannot be pinned (to prevent confusion about authority)

### AccountabilityPartnership

The AccountabilityPartnership aggregate represents a matched pair of users who commit to supporting each other.

```typescript
interface AccountabilityPartnership {
  readonly id: string;
  readonly requesterId: UserId;
  readonly partnerId: UserId;
  readonly formedAt: Timestamp;
  status: PartnershipStatus;
  messages: PartnerMessage[];
  sharedCommitments: SharedCommitment[];
  matchCriteria: MatchCriteria;
  endedAt: Timestamp | null;
  endedReason: string | null;

  requestPartnership(): PartnershipRequested;
  acceptPartnership(): PartnershipFormed;
  declinePartnership(): void;
  sendMessage(message: PartnerMessage): PartnerMessageSent;
  createCommitment(commitment: SharedCommitment): SharedCommitmentCreated;
  completeCommitment(commitmentId: string, userId: UserId): SharedCommitmentCompleted;
  endPartnership(reason: string, endedBy: UserId): PartnershipEnded;
}
```

**Invariants:**
- A user can have at most 2 active accountability partnerships
- A partnership requires both users to have active subscriptions
- Messages can only be sent in an active partnership
- A shared commitment must be acknowledged by both partners before it is active
- A user cannot form a partnership with themselves
- A partnership request expires after 7 days if not accepted
- Either partner can end the partnership at any time
- Commitments cannot be created in an ended partnership

---

## Entities

### PostComment

A comment on a Brotherhood post.

```typescript
interface PostComment {
  readonly id: string;
  readonly postId: string;
  readonly authorIdentity: AuthorIdentity;
  readonly createdAt: Timestamp;
  content: string; // Max 1000 chars
  moderationStatus: ModerationStatus;
  isRemoved: boolean;
}
```

### Vote

A single upvote on a post.

```typescript
interface Vote {
  readonly id: string;
  readonly postId: string;
  readonly userId: UserId;
  readonly createdAt: Timestamp;
}
```

### ModerationDecision

The result of AI-assisted or manual moderation of a post or comment.

```typescript
interface ModerationDecision {
  readonly id: string;
  readonly contentId: string;
  readonly contentType: 'post' | 'comment';
  readonly decision: 'approved' | 'rejected' | 'flagged_for_review';
  readonly reason: ModerationReason;
  readonly confidence: number; // 0-1, AI moderation confidence
  readonly decidedBy: 'ai' | 'manual';
  readonly decidedAt: Timestamp;
  readonly reviewedBy: UserId | null; // For manual review of flagged content
  readonly reviewNotes: string | null;
}
```

### PartnerMessage

A private message between accountability partners.

```typescript
interface PartnerMessage {
  readonly id: string;
  readonly partnershipId: string;
  readonly senderId: UserId;
  readonly createdAt: Timestamp;
  content: string; // Max 2000 chars
  readAt: Timestamp | null;
}
```

### SharedCommitment

A mutual commitment between accountability partners -- a concrete action they hold each other to.

```typescript
interface SharedCommitment {
  readonly id: string;
  readonly partnershipId: string;
  readonly createdBy: UserId;
  readonly title: string;
  readonly description: string;
  readonly dueDate: Timestamp;
  status: CommitmentStatus;
  requesterCompleted: boolean;
  partnerCompleted: boolean;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
}
```

---

## Value Objects

```typescript
/** Content of a Brotherhood post */
interface PostContent {
  readonly text: string; // Required, max 5000 chars
  readonly category: PostCategory;
  readonly dialRelated: DialType | null; // Optional dial association
  readonly isAnonymous: boolean;
  readonly attachmentUrl: string | null; // Optional image
}

type PostCategory =
  | 'win' // Sharing a victory
  | 'struggle' // Asking for support
  | 'question' // Seeking advice
  | 'resource' // Sharing helpful content
  | 'accountability' // Public commitment
  | 'encouragement'; // Encouraging others

/** Author identity, which may be anonymous */
interface AuthorIdentity {
  readonly userId: UserId;
  readonly displayName: string; // Could be real name or anonymous handle
  readonly isAnonymous: boolean;
  readonly memberSince: Timestamp;
  readonly currentStreak: number; // Engagement streak shown as credibility signal
}

/** Moderation state of content */
type ModerationStatus =
  | 'pending' // Awaiting moderation
  | 'approved' // Passed moderation
  | 'rejected' // Failed moderation
  | 'flagged' // Needs manual review
  | 'removed'; // Removed after being live

/** Reason for moderation decision */
interface ModerationReason {
  readonly code: ModerationReasonCode;
  readonly explanation: string;
}

type ModerationReasonCode =
  | 'clean' // Content is appropriate
  | 'toxic_language' // Hostile, degrading, or abusive language
  | 'spouse_bashing' // Disrespectful language about a spouse
  | 'inappropriate_content' // Sexual, violent, or otherwise inappropriate
  | 'spam' // Promotional or repetitive content
  | 'off_topic' // Not related to marriage/relationships
  | 'self_harm' // Content suggesting self-harm or harm to others
  | 'needs_professional' // Content suggesting need for professional help (therapist, crisis)
  | 'doxxing'; // Sharing personal information of others

/** Running vote count for a post */
interface VoteCount {
  readonly total: number; // >= 0
  readonly voterIds: ReadonlySet<string>; // For deduplication
}

/** Status of an accountability partnership */
type PartnershipStatus =
  | 'requested' // One user has requested
  | 'active' // Both users have accepted
  | 'paused' // Temporarily paused by one partner
  | 'ended'; // Permanently ended

/** Criteria used for matching accountability partners */
interface MatchCriteria {
  readonly marriageStage: MarriageStage;
  readonly primaryDialFocus: DialType;
  readonly preferredCheckInFrequency: 'daily' | 'every_other_day' | 'weekly';
  readonly timezone: string;
}

/** Status of a shared commitment */
type CommitmentStatus =
  | 'proposed' // Created by one partner, awaiting acknowledgment
  | 'active' // Both partners have acknowledged
  | 'completed' // Both partners have marked complete
  | 'expired' // Past due date without completion
  | 'cancelled'; // Cancelled by either partner
```

---

## Domain Events

```typescript
interface PostCreated {
  readonly eventType: 'community.post_created';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly postId: string;
    readonly authorId: UserId;
    readonly isAnonymous: boolean;
    readonly category: PostCategory;
    readonly dialRelated: DialType | null;
    readonly contentLength: number;
  };
}

interface PostModerated {
  readonly eventType: 'community.post_moderated';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly postId: string;
    readonly decision: 'approved' | 'rejected' | 'flagged_for_review';
    readonly reasonCode: ModerationReasonCode;
    readonly confidence: number;
    readonly decidedBy: 'ai' | 'manual';
  };
}

interface PostUpvoted {
  readonly eventType: 'community.post_upvoted';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly postId: string;
    readonly voterId: UserId;
    readonly newVoteCount: number;
    readonly authorId: UserId;
  };
}

interface PostPinned {
  readonly eventType: 'community.post_pinned';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly postId: string;
    readonly pinnedBy: UserId;
  };
}

interface PostRemoved {
  readonly eventType: 'community.post_removed';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly postId: string;
    readonly reason: string;
    readonly removedBy: UserId;
    readonly wasLive: boolean; // Was it visible to users before removal
  };
}

interface PartnershipRequested {
  readonly eventType: 'community.partnership_requested';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly partnershipId: string;
    readonly requesterId: UserId;
    readonly partnerId: UserId;
    readonly matchCriteria: MatchCriteria;
  };
}

interface PartnershipFormed {
  readonly eventType: 'community.partnership_formed';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly partnershipId: string;
    readonly requesterId: UserId;
    readonly partnerId: UserId;
    readonly matchScore: number;
  };
}

interface PartnerMessageSent {
  readonly eventType: 'community.partner_message_sent';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly partnershipId: string;
    readonly messageId: string;
    readonly senderId: UserId;
    readonly recipientId: UserId;
    readonly contentLength: number;
  };
}

interface SharedCommitmentCreated {
  readonly eventType: 'community.shared_commitment_created';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly commitmentId: string;
    readonly partnershipId: string;
    readonly createdBy: UserId;
    readonly title: string;
    readonly dueDate: Timestamp;
  };
}

interface SharedCommitmentCompleted {
  readonly eventType: 'community.shared_commitment_completed';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly commitmentId: string;
    readonly partnershipId: string;
    readonly completedBy: UserId;
    readonly bothCompleted: boolean;
  };
}

interface PartnershipEnded {
  readonly eventType: 'community.partnership_ended';
  readonly occurredAt: Timestamp;
  readonly payload: {
    readonly partnershipId: string;
    readonly endedBy: UserId;
    readonly reason: string;
    readonly durationDays: number;
    readonly messagesExchanged: number;
    readonly commitmentsCompleted: number;
  };
}
```

---

## Repositories

```typescript
interface BrotherhoodPostRepository {
  /** Find post by ID */
  findById(id: string): Promise<BrotherhoodPost | null>;

  /** Get the community feed with pagination, only showing approved posts */
  findApproved(
    pagination: { cursor: string | null; limit: number },
    filters?: {
      category?: PostCategory;
      dialRelated?: DialType;
      authorId?: UserId;
    }
  ): Promise<PaginatedResult<BrotherhoodPost>>;

  /** Get pinned posts */
  findPinned(): Promise<BrotherhoodPost[]>;

  /** Get posts pending moderation */
  findPendingModeration(): Promise<BrotherhoodPost[]>;

  /** Get posts flagged for manual review */
  findFlaggedForReview(): Promise<BrotherhoodPost[]>;

  /** Get posts by a specific author */
  findByAuthor(userId: UserId): Promise<BrotherhoodPost[]>;

  /** Persist a post */
  save(post: BrotherhoodPost): Promise<void>;
}

interface VoteRepository {
  /** Find all votes for a post */
  findByPostId(postId: string): Promise<Vote[]>;

  /** Check if a user has voted on a post */
  hasVoted(postId: string, userId: UserId): Promise<boolean>;

  /** Persist a vote */
  save(vote: Vote): Promise<void>;

  /** Remove a vote */
  delete(postId: string, userId: UserId): Promise<void>;
}

interface AccountabilityPartnershipRepository {
  /** Find partnership by ID */
  findById(id: string): Promise<AccountabilityPartnership | null>;

  /** Find all active partnerships for a user */
  findActiveByUserId(userId: UserId): Promise<AccountabilityPartnership[]>;

  /** Find pending partnership requests for a user */
  findPendingRequestsForUser(userId: UserId): Promise<AccountabilityPartnership[]>;

  /** Find expired requests for cleanup */
  findExpiredRequests(expirationDate: Timestamp): Promise<AccountabilityPartnership[]>;

  /** Count active partnerships for a user (for enforcing the 2-partner limit) */
  countActiveByUserId(userId: UserId): Promise<number>;

  /** Persist a partnership */
  save(partnership: AccountabilityPartnership): Promise<void>;
}

interface PartnerMessageRepository {
  /** Get messages for a partnership, paginated */
  findByPartnershipId(
    partnershipId: string,
    pagination: { cursor: string | null; limit: number }
  ): Promise<PaginatedResult<PartnerMessage>>;

  /** Get unread message count for a user across all partnerships */
  countUnreadByUserId(userId: UserId): Promise<number>;

  /** Mark messages as read */
  markAsRead(partnershipId: string, userId: UserId, upToMessageId: string): Promise<void>;

  /** Persist a message */
  save(message: PartnerMessage): Promise<void>;
}
```

---

## Domain Services

### ContentModerationService

AI-assisted moderation that screens posts and comments for appropriateness.

```typescript
interface ContentModerationService {
  /** Moderate a post using AI, escalating to manual review when confidence is low */
  moderatePost(post: BrotherhoodPost): Promise<ModerationDecision>;

  /** Moderate a comment */
  moderateComment(comment: PostComment): Promise<ModerationDecision>;

  /** Re-moderate content after manual review */
  manualReview(
    contentId: string,
    contentType: 'post' | 'comment',
    decision: 'approved' | 'rejected',
    reviewerId: UserId,
    notes: string
  ): Promise<ModerationDecision>;
}
```

### AccountabilityMatchingService

Matches users into accountability partnerships based on compatibility criteria.

```typescript
interface AccountabilityMatchingService {
  /** Find potential accountability partners for a user */
  findMatches(
    userId: UserId,
    criteria: MatchCriteria,
    limit: number
  ): Promise<{ userId: UserId; matchScore: number; criteria: MatchCriteria }[]>;

  /** Calculate match score between two users */
  calculateMatchScore(
    userACriteria: MatchCriteria,
    userBCriteria: MatchCriteria
  ): number;
}
```
