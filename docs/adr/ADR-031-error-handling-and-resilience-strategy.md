# ADR-031: Error Handling and Resilience Strategy

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Coach Keith AI app's core value proposition — real-time AI coaching conversations — depends on the Anthropic Claude API, an external service outside our control. Claude API outages, rate limits, or degraded performance directly impact the user experience. Beyond the AI dependency, the app also relies on Pinecone (vector search for RAG), RevenueCat (subscription management), Firebase/APNs (push notifications), and AWS services (S3, SQS, Lambda). Any of these can experience transient failures, and the app must handle them gracefully. The key design question is: when the AI is unavailable, should the app tell the user honestly ("AI is down, try later") or provide a degraded but still valuable experience? Given Keith's coaching philosophy of always showing up for people, we chose the latter.

**Decision:**
We will implement a comprehensive resilience strategy using circuit breakers, retry policies with exponential backoff, pre-generated fallback responses for AI outages, and graceful degradation across all features.

1. **Circuit Breaker (opossum v8):** The Claude API client is wrapped in a circuit breaker using the `opossum` library (v8.1+). Configuration:
   - **Failure threshold:** 50% of requests failing within a 30-second rolling window
   - **Minimum requests:** 5 requests before the circuit evaluates (prevents opening on low traffic)
   - **Reset timeout:** 30 seconds in open state before attempting a half-open probe
   - **Timeout:** 30 seconds per request (Claude Sonnet can take up to 20s for complex responses)
   - When the circuit opens, all subsequent requests immediately receive fallback responses instead of queuing up and timing out. The circuit breaker emits events (`open`, `halfOpen`, `close`) that are logged and tracked as metrics (ADR-027).

2. **Retry Policy (Exponential Backoff with Jitter):** For transient failures (HTTP 429 rate limits, 500/502/503 server errors, network timeouts), requests are retried with exponential backoff:
   - Base delay: 1 second
   - Multiplier: 2x (1s, 2s, 4s)
   - Maximum retries: 3
   - Jitter: random 0-500ms added to each delay to prevent thundering herd
   - Non-retryable errors (400 Bad Request, 401 Unauthorized, 403 Forbidden) are not retried
   - The Anthropic SDK's built-in retry logic is disabled in favor of our custom implementation to maintain consistency with the circuit breaker

3. **Pre-Generated Fallback Responses:** When the circuit breaker is open or all retries are exhausted, the AI coaching feature serves pre-generated fallback responses stored in a `fallback_responses` PostgreSQL table. Fallback content is authored by Keith and categorized by coaching context:
   - **General check-in:** "Keith is taking a breather — here's a framework to work through while he's away. Take 5 minutes to journal on these three questions: What's the one thing you're avoiding right now? What would happen if you faced it today? What's the smallest step you could take in the next hour?"
   - **Goal setting:** A structured goal-setting worksheet with Keith's BOLD framework
   - **Accountability:** A self-assessment checklist for reviewing commitments
   - **Crisis/emotional support:** Grounding exercises and a prompt to reach out to their accountability partner or professional support resources
   - Fallback responses are selected based on the user's current coaching context (last conversation topic, active goals) and randomized to avoid repetition. The response includes a clear indicator that it is a pre-generated framework, not a live AI response, maintaining user trust.

4. **Graceful Degradation Hierarchy:** When the AI is unavailable, the app degrades gracefully rather than showing error screens:
   - **AI Coaching:** Serves fallback responses (as above) + enables "journal mode" where the user can write freely and their entry is queued for AI processing when service resumes
   - **Content Moderation (ADR-026):** Falls back to keyword-based filtering (a blocklist of obviously harmful terms) + posts are queued for AI review when service resumes. This allows community activity to continue during AI outages.
   - **Brotherhood Community:** Fully functional (no AI dependency for core read/write operations)
   - **Accountability Messaging:** Fully functional (no AI dependency)
   - **Push Notifications:** Fully functional (no AI dependency)
   - **RAG Retrieval (Pinecone):** If Pinecone is unavailable, coaching falls back to non-RAG responses (Claude without Keith's content context), with a quality indicator logged

5. **Error Response Standardization:** All errors returned to the mobile client follow the contract defined in ADR-030. Resilience-related errors include specific codes:
   - `AI_TEMPORARILY_UNAVAILABLE` (503): Circuit breaker is open, fallback response served
   - `AI_DEGRADED_RESPONSE` (200 with metadata): Response generated without RAG context
   - `RATE_LIMITED` (429): User or system rate limit hit, with `Retry-After` header
   - The mobile app uses these codes to display appropriate UI states (e.g., a subtle banner "Coach Keith is using offline mode" rather than an error dialog)

6. **Health Check Endpoint:** A `/health` endpoint reports the status of all dependencies (PostgreSQL, Redis, Pinecone, Claude API circuit breaker state) as a structured JSON response. ECS task health checks use this endpoint. A `/health/ready` endpoint indicates whether the service can accept traffic (all critical dependencies are reachable).

**Consequences:**

### Pros (+)
- Users always receive value from the app, even during AI outages — Keith's philosophy of "always showing up" is reflected in the architecture
- Circuit breaker prevents cascade failures where slow AI responses consume all server resources
- Exponential backoff with jitter handles transient failures without overwhelming recovering services
- Pre-generated fallback content is authored by Keith, maintaining brand voice and coaching quality even in degraded mode
- Journal-mode queuing ensures no user input is lost during outages
- Graceful degradation keeps community and messaging features fully operational during AI issues

### Cons (-)
- Pre-generated fallback responses require ongoing authoring and curation by Keith's team
- Fallback responses cannot address the user's specific situation, reducing coaching value during outages
- Circuit breaker tuning (thresholds, timeouts) requires operational experience and may need adjustment as usage patterns emerge
- The degradation hierarchy adds complexity to the mobile app's state management (tracking which features are in degraded mode)
- Queued journal entries and moderation checks create a processing backlog when AI service recovers

### Tradeoffs
We chose user experience continuity over fully honest failure reporting. An alternative approach would simply show "AI coaching is temporarily unavailable" and disable the feature. This is more transparent but provides zero value during an outage. Keith's coaching philosophy emphasizes that a framework or exercise is always better than nothing — a user in a difficult moment should never open the app and find it useless. The tradeoff is that fallback responses are generic rather than personalized, and the user must understand they are receiving pre-generated content. We mitigate this by clearly labeling fallback responses and queuing the user's input for AI follow-up when service resumes, creating a continuity of care across the outage boundary.
