import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface CommunityPost {
  id: string;
  userId: string;
  authorName: string;
  content: string;
  category: 'win' | 'question' | 'encouragement' | 'accountability' | 'testimony';
  upvotes: Set<string>;
  isModerated: boolean;
  moderationFlag?: string;
  createdAt: Date;
}

interface Partnership {
  id: string;
  userId: string;
  partnerId: string;
  status: 'pending' | 'active' | 'ended';
  matchReason: string;
  createdAt: Date;
  activatedAt?: Date;
}

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);
  private posts: Map<string, CommunityPost> = new Map();
  private partnerships: Map<string, Partnership[]> = new Map();
  private partnerQueue: Array<{ userId: string; preferences: any; requestedAt: Date }> = [];

  // Content moderation blocklist patterns
  private readonly MODERATION_PATTERNS = [
    /\b(spam|scam|click here|buy now)\b/i,
    /https?:\/\/[^\s]+\.(xyz|tk|ml|ga)\b/i,
    /\b(hate|slur|violent threat)\b/i,
  ];

  private readonly SENSITIVE_TOPICS = [
    /\b(suicid|self.harm|abuse|domestic violence)\b/i,
  ];

  async listPosts(
    page: number = 1,
    limit: number = 20,
    category?: string,
  ) {
    let allPosts = Array.from(this.posts.values())
      .filter((p) => p.isModerated)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (category) {
      allPosts = allPosts.filter((p) => p.category === category);
    }

    const total = allPosts.length;
    const offset = (page - 1) * limit;
    const items = allPosts.slice(offset, offset + limit).map((p) => ({
      id: p.id,
      authorName: p.authorName,
      content: p.content,
      category: p.category,
      upvoteCount: p.upvotes.size,
      createdAt: p.createdAt,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createPost(
    userId: string,
    data: {
      content: string;
      category: CommunityPost['category'];
      authorName: string;
    },
  ) {
    // Run content moderation
    const moderationResult = this.moderateContent(data.content);

    if (moderationResult.blocked) {
      throw new ForbiddenException(
        `Post rejected: ${moderationResult.reason}. The Brotherhood is a safe space for growth — please keep content constructive.`,
      );
    }

    const post: CommunityPost = {
      id: uuidv4(),
      userId,
      authorName: data.authorName,
      content: data.content,
      category: data.category,
      upvotes: new Set(),
      isModerated: !moderationResult.flagged, // Auto-approve if not flagged
      moderationFlag: moderationResult.flagged
        ? moderationResult.reason
        : undefined,
      createdAt: new Date(),
    };

    this.posts.set(post.id, post);

    this.logger.log(
      `Post created by ${userId}: category=${data.category}, moderated=${post.isModerated}`,
    );

    if (moderationResult.sensitiveTopicDetected) {
      // In production, trigger notification to support team
      this.logger.warn(
        `Sensitive topic detected in post ${post.id} by user ${userId}. Content flagged for human review.`,
      );
    }

    return {
      id: post.id,
      content: post.content,
      category: post.category,
      status: post.isModerated ? 'published' : 'pending_review',
      createdAt: post.createdAt,
      ...(moderationResult.sensitiveTopicDetected && {
        supportNote:
          'It sounds like you may be going through something serious. Remember, Coach Keith AI is here for coaching — if you are in crisis, please reach out to a professional counselor or call 988 (Suicide & Crisis Lifeline).',
      }),
    };
  }

  async upvotePost(userId: string, postId: string) {
    const post = this.posts.get(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (!post.isModerated) {
      throw new NotFoundException('Post not found');
    }

    if (post.upvotes.has(userId)) {
      // Toggle off — remove upvote
      post.upvotes.delete(userId);
      return { postId, upvoted: false, upvoteCount: post.upvotes.size };
    }

    post.upvotes.add(userId);
    return { postId, upvoted: true, upvoteCount: post.upvotes.size };
  }

  async getPartnerships(userId: string) {
    const userPartnerships = (this.partnerships.get(userId) || []).map((p) => ({
      id: p.id,
      partnerId: p.partnerId,
      status: p.status,
      matchReason: p.matchReason,
      createdAt: p.createdAt,
      activatedAt: p.activatedAt,
    }));

    return {
      active: userPartnerships.filter((p) => p.status === 'active'),
      pending: userPartnerships.filter((p) => p.status === 'pending'),
      totalPartners: userPartnerships.filter((p) => p.status === 'active')
        .length,
    };
  }

  async requestPartnerMatch(
    userId: string,
    preferences: {
      focusDials?: string[];
      timezone?: string;
      experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    },
  ) {
    // Check if user already has a pending request
    const existingRequest = this.partnerQueue.find(
      (r) => r.userId === userId,
    );
    if (existingRequest) {
      throw new BadRequestException(
        'You already have a pending partner match request.',
      );
    }

    // Check if there is a compatible match in the queue
    const match = this.findCompatibleMatch(userId, preferences);

    if (match) {
      // Create partnership for both users
      const partnership: Partnership = {
        id: uuidv4(),
        userId,
        partnerId: match.userId,
        status: 'active',
        matchReason: this.generateMatchReason(preferences, match.preferences),
        createdAt: new Date(),
        activatedAt: new Date(),
      };

      const reversePartnership: Partnership = {
        id: uuidv4(),
        userId: match.userId,
        partnerId: userId,
        status: 'active',
        matchReason: partnership.matchReason,
        createdAt: partnership.createdAt,
        activatedAt: partnership.activatedAt,
      };

      // Store partnerships
      const userP = this.partnerships.get(userId) || [];
      userP.push(partnership);
      this.partnerships.set(userId, userP);

      const matchP = this.partnerships.get(match.userId) || [];
      matchP.push(reversePartnership);
      this.partnerships.set(match.userId, matchP);

      // Remove match from queue
      this.partnerQueue = this.partnerQueue.filter(
        (r) => r.userId !== match.userId,
      );

      this.logger.log(
        `Partnership matched: ${userId} <-> ${match.userId}`,
      );

      return {
        status: 'matched',
        partnership: {
          id: partnership.id,
          partnerId: partnership.partnerId,
          matchReason: partnership.matchReason,
        },
        message:
          'You have been matched with an accountability partner! Start your journey together.',
      };
    }

    // No match found — add to queue
    this.partnerQueue.push({
      userId,
      preferences,
      requestedAt: new Date(),
    });

    this.logger.log(
      `User ${userId} added to partner queue (queue size: ${this.partnerQueue.length})`,
    );

    return {
      status: 'queued',
      queuePosition: this.partnerQueue.length,
      message:
        'You have been added to the matching queue. We will notify you when a compatible accountability partner is found.',
    };
  }

  private moderateContent(content: string): {
    blocked: boolean;
    flagged: boolean;
    sensitiveTopicDetected: boolean;
    reason?: string;
  } {
    // Check for blocked content
    for (const pattern of this.MODERATION_PATTERNS) {
      if (pattern.test(content)) {
        return {
          blocked: true,
          flagged: true,
          sensitiveTopicDetected: false,
          reason: 'Content violates community guidelines',
        };
      }
    }

    // Check for sensitive topics (do not block, but flag for review and show resources)
    for (const pattern of this.SENSITIVE_TOPICS) {
      if (pattern.test(content)) {
        return {
          blocked: false,
          flagged: true,
          sensitiveTopicDetected: true,
          reason: 'Sensitive topic detected — flagged for human review',
        };
      }
    }

    return {
      blocked: false,
      flagged: false,
      sensitiveTopicDetected: false,
    };
  }

  private findCompatibleMatch(
    userId: string,
    preferences: any,
  ): { userId: string; preferences: any } | null {
    // Simple matching: find someone in the queue who is not the same user
    // In production, this would use Ruvector embeddings for semantic similarity
    const candidates = this.partnerQueue.filter(
      (r) => r.userId !== userId,
    );

    if (candidates.length === 0) return null;

    // Prefer timezone match, then shared focus dials
    const scored = candidates.map((c) => {
      let score = 0;
      if (
        preferences.timezone &&
        c.preferences.timezone === preferences.timezone
      ) {
        score += 3;
      }
      if (preferences.focusDials && c.preferences.focusDials) {
        const shared = preferences.focusDials.filter((d: string) =>
          c.preferences.focusDials.includes(d),
        );
        score += shared.length;
      }
      if (
        preferences.experienceLevel &&
        c.preferences.experienceLevel === preferences.experienceLevel
      ) {
        score += 2;
      }
      return { ...c, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  private generateMatchReason(prefs1: any, prefs2: any): string {
    const reasons: string[] = [];
    if (prefs1.timezone === prefs2.timezone) {
      reasons.push('same timezone');
    }
    if (prefs1.focusDials && prefs2.focusDials) {
      const shared = prefs1.focusDials.filter((d: string) =>
        prefs2.focusDials?.includes(d),
      );
      if (shared.length > 0) {
        reasons.push(`shared focus on ${shared.join(' and ')}`);
      }
    }
    if (prefs1.experienceLevel === prefs2.experienceLevel) {
      reasons.push(`similar experience level (${prefs1.experienceLevel})`);
    }
    return reasons.length > 0
      ? `Matched based on ${reasons.join(', ')}`
      : 'Matched based on availability';
  }
}
