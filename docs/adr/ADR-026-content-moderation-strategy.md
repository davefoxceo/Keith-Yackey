# ADR-026: Content Moderation Strategy

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Brotherhood community (ADR-022) and accountability messaging (ADR-024) features generate user-created content that must be moderated for safety, community standards, and alignment with Keith's coaching philosophy. Content moderation must balance three priorities: user safety (no harassment, explicit content, or harmful advice), community culture (constructive framing, vulnerability, accountability), and minimal friction (moderation should not noticeably slow down the posting experience). We evaluated fully manual moderation, third-party moderation APIs (Amazon Rekognition for images, Hive Moderation, Perspective API), and AI-first moderation using Claude models. Given that Keith's community standards go beyond standard content safety — requiring contextual understanding of coaching-specific norms — a general-purpose moderation API is insufficient.

**Decision:**
We will implement a hybrid moderation strategy with three layers: pre-publish AI check, post-publish community reporting, and human review for flagged content.

1. **Pre-Publish AI Check (Claude 3.5 Haiku):** Every post, comment, and public message is evaluated by Claude 3.5 Haiku before being persisted and displayed. The moderation prompt includes Keith's community guidelines as system context and evaluates content against specific criteria: safety violations (harassment, threats, explicit content, dangerous advice), community standard violations (unconstructive negativity, spam, self-promotion, unsolicited coaching), and tone alignment (encouraging vulnerability, accountability, and growth mindset). The AI returns a structured JSON response:
   ```json
   {
     "verdict": "approved" | "flagged_for_review" | "rejected",
     "confidence": 0.0-1.0,
     "reason": "string",
     "category": "safety" | "community_standards" | "tone",
     "suggested_revision": "string (optional)"
   }
   ```
   Target latency is under 500ms. Claude 3.5 Haiku p95 latency for short prompts is ~300ms, leaving headroom for network overhead. Content scoring below 0.7 confidence on an "approved" verdict is automatically escalated to `flagged_for_review`.

2. **Post-Publish Community Reporting:** Users can report any post or comment via a contextual menu. Report reasons include "Harmful content," "Spam or self-promotion," "Harassment," and "Other." Posts receiving 3+ reports within 24 hours are automatically hidden and escalated to the human review queue. Reporting is rate-limited to 10 reports per user per day to prevent abuse.

3. **Human Review Queue:** Flagged content (from AI or community reports) enters a review queue accessible via an admin dashboard. Reviewers (Keith's team members) can approve, reject, or edit content. Reviewer decisions feed back into the AI moderation system as few-shot examples, improving accuracy over time. Target review SLA is 4 hours during business hours.

4. **Image Moderation:** Images attached to posts are screened via Amazon Rekognition Content Moderation API for explicit or violent content before the AI text check runs. Images flagged with confidence > 80% are rejected; 50-80% confidence triggers human review.

5. **Moderation Logging:** All moderation decisions (AI verdicts, community reports, human reviews) are logged to a `moderation_events` table for audit trail and model improvement analysis.

**Consequences:**

### Pros (+)
- Pre-publish AI check prevents harmful content from ever being visible to other users
- Keith-specific community standards are enforceable via custom AI prompts, not just generic safety rules
- Sub-500ms latency keeps the posting experience feeling responsive
- Community reporting provides a fallback for content the AI misses
- Human review ensures controversial edge cases receive thoughtful evaluation
- Feedback loop from human reviewers continuously improves AI accuracy

### Cons (-)
- Per-request cost for Claude Haiku moderation (~$0.00025 per check at average token usage), though minimal at expected volumes
- False positives from AI may frustrate users whose legitimate posts are flagged or rejected
- Human review creates an operational burden requiring dedicated staff time
- The moderation prompt must be carefully maintained as community standards evolve

### Tradeoffs
We prioritized safety with minimal latency impact. An alternative approach — post-publish-only moderation — would eliminate the latency cost entirely but allow harmful content to be visible (even briefly) to other users. For a coaching community focused on vulnerability and trust, even brief exposure to harmful content can damage the safe space Keith is building. The sub-500ms pre-publish check is an acceptable cost for maintaining that safety guarantee. The tradeoff is a small per-post API cost and occasional false positives, both of which are manageable through monitoring and prompt refinement.
