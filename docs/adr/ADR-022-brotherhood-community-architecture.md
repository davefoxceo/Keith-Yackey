# ADR-022: Brotherhood Community Architecture

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Brotherhood is a core community feature of the Coach Keith AI app, providing a space where users share wins, ask questions, post accountability updates, and support each other. This is not a general-purpose social network — it is a moderated, focused community aligned with Coach Keith's coaching philosophy. We evaluated third-party feed SDKs (Stream.io, GetStream) and a custom-built solution. Stream.io offers rapid time-to-market with pre-built feed infrastructure, reactions, and moderation tools, but limits our ability to deeply integrate AI moderation into the content pipeline and charges per Monthly Active User (~$0.0075/MAU), which becomes significant at scale. More critically, we need AI moderation to enforce Keith's specific community standards — not just generic content safety — which requires custom integration into the publish flow.

**Decision:**
We will build a custom community feed backed by PostgreSQL and Redis, with AI moderation powered by Claude Haiku integrated into the content creation pipeline.

1. **Data Model (PostgreSQL 16):** Core tables include `posts` (id, author_id, content, media_urls[], post_type enum, moderation_status, created_at, updated_at), `post_votes` (user_id, post_id, vote_type, unique constraint), `post_comments` (id, post_id, author_id, content, parent_comment_id for threading, moderation_status), and `post_reports` (id, post_id, reporter_id, reason, status).

2. **Feed Ranking (Redis Sorted Sets):** Each user's feed is materialized as a Redis sorted set keyed by `feed:{userId}`. Post scores combine recency (Unix timestamp), engagement (vote count * 0.1), and author affinity. A background worker (Bull queue on Redis) recalculates feed scores every 60 seconds for active posts. The sorted set is capped at 500 entries per user; older content is fetched via PostgreSQL fallback.

3. **AI Moderation Pipeline (Pre-Publish):** Before any post or comment is persisted, the content is sent to Claude 3.5 Haiku via the Anthropic API. The moderation prompt evaluates against Keith's community guidelines: no negativity without constructive framing, no spam or self-promotion, no explicit content, and encouragement of vulnerability and accountability. The AI returns a JSON verdict (`approved`, `flagged_for_review`, `rejected`) with a reason. Flagged content enters a human review queue; rejected content is returned to the user with guidance on how to rephrase. Target latency for the AI check is under 500ms (Haiku p95 is ~300ms).

4. **Media Handling:** Images are uploaded to S3 via pre-signed URLs, processed through a Lambda-based resize pipeline (thumbnails at 200px, standard at 800px), and served via CloudFront CDN.

**Consequences:**

### Pros (+)
- Full control over the moderation pipeline, enabling Keith-specific community standards enforcement
- No per-MAU costs from third-party feed providers
- AI moderation catches policy violations before they are visible to other users
- Custom ranking algorithm can be tuned to promote accountability posts and community engagement
- PostgreSQL full-text search enables content discovery without additional infrastructure

### Cons (-)
- Significantly more development effort than integrating Stream.io (estimated 3-4 additional weeks)
- Feed ranking algorithm requires ongoing tuning and monitoring
- Custom infrastructure means we own reliability, pagination edge cases, and real-time update delivery
- AI moderation adds latency to every post creation (though sub-500ms is acceptable)

### Tradeoffs
We chose control over the AI moderation pipeline and long-term cost efficiency over the speed-to-market that Stream.io would provide. Stream.io could have given us a working community feed in days rather than weeks, but integrating a custom AI moderation step into Stream's publish pipeline would require webhook-based workarounds that introduce complexity and latency. By building custom, the moderation step is a first-class part of the content creation flow, and we avoid ongoing per-MAU fees that would scale linearly with user growth.
