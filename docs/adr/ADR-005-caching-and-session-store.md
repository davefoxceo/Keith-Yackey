# ADR-005: Caching and Session Store Strategy

**Status:** Proposed
**Date:** 2026-03-22

**Context:**

The Coach Keith AI platform has several workloads that benefit from low-latency data access beyond what PostgreSQL can provide:

1. **Session management** — JWT refresh tokens, active session tracking, and device fingerprinting. Sessions must be validated on every authenticated API request.
2. **Rate limiting** — Per-user rate limits on AI coaching requests (Standard: 50/day, Premium: 200/day). Must be enforced atomically across multiple API instances.
3. **Subscription entitlement caching** — Subscription tier (Free, Standard, Premium) determines feature access, model selection (Sonnet vs Opus), and rate limits. Checking Stripe on every request is too slow and expensive.
4. **Conversation context assembly** — The AI proxy must assemble the last N messages of conversation history, user profile context, and RAG results into a prompt. Caching assembled context avoids repeated database queries during a conversation session.
5. **Real-time features** — Typing indicators, online presence, and pub/sub for multi-device sync require a message broker.

We evaluated:

1. **Redis (ElastiCache)** — In-memory key-value store with rich data structures.
2. **DynamoDB** — Serverless key-value store with single-digit ms latency.
3. **Application-level caching (in-memory)** — Node.js in-process cache (e.g., `node-cache`).

Application-level caching was rejected because ECS runs multiple Fargate tasks, and in-process caches cannot be shared across instances — leading to inconsistent rate limiting and stale entitlement data.

**Decision:**

We will use **Redis 7** on **Amazon ElastiCache** as our caching layer and session store. Configuration:

- **Instance**: `cache.t4g.micro` (2 vCPU, 0.5 GB RAM) for V1, scaling to `cache.t4g.small` as needed
- **Deployment**: Single-node for V1 (no replication), with promotion to a 2-node replica set before exceeding 2,000 concurrent users
- **Eviction policy**: `allkeys-lru` — least recently used eviction when memory is full
- **Persistence**: RDB snapshots every 15 minutes (acceptable data loss window for cache data)
- **Client library**: `ioredis` v5 with connection pooling (pool size: 10)
- **NestJS integration**: `@nestjs/cache-manager` with `cache-manager-ioredis-yet` adapter

Key usage patterns and TTLs:

| Data | Redis Structure | TTL | Purpose |
|------|----------------|-----|---------|
| Session tokens | `STRING` | 7 days | JWT refresh token validation |
| Rate limit counters | `STRING` with `INCR` | 24 hours (reset at midnight UTC) | Daily AI request limits |
| Subscription entitlements | `HASH` | 5 minutes | Tier, features, model access |
| Conversation context | `LIST` | 30 minutes (sliding) | Last 20 messages for active conversation |
| User profile cache | `HASH` | 10 minutes | Name, preferences, assessment scores |
| Typing indicators | `PUB/SUB` channel | N/A (fire-and-forget) | Real-time typing status |
| Feature flags | `HASH` | 1 minute | A/B test assignments, feature toggles |

Rate limiting implementation uses Redis's atomic `INCR` with `EXPIRE`:

```typescript
// Atomic rate limit check — no race conditions across ECS tasks
const key = `ratelimit:ai:${userId}:${today}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 86400);
if (count > userTierLimit) throw new TooManyRequestsException();
```

**Consequences:**

### Pros (+)
- **Sub-millisecond reads**: Redis delivers p99 read latency under 1ms on ElastiCache, ensuring that session validation and rate limit checks add negligible overhead to every API request.
- **Atomic operations for rate limiting**: Redis's `INCR`, `EXPIRE`, and Lua scripting capabilities enable race-condition-free rate limiting across multiple ECS Fargate tasks — critical for enforcing per-user daily AI request quotas.
- **Pub/Sub for real-time features**: Redis Pub/Sub provides a lightweight message broker for typing indicators and multi-device session sync without introducing a separate message queue (e.g., SQS, RabbitMQ).
- **Rich data structures**: Sorted sets for future leaderboard features (community engagement scores), lists for conversation context assembly, and hashes for structured user/entitlement data.
- **BullMQ compatibility**: BullMQ (our background job processor) uses Redis as its backend, so the same ElastiCache instance serves double duty for job queues and caching.

### Cons (-)
- **Additional infrastructure**: Introduces another managed service to monitor, secure, and budget for. ElastiCache `cache.t4g.micro` costs ~$12/month, but operational overhead (monitoring, alerting, connection management) is non-trivial.
- **Data loss risk**: Redis is an in-memory store. Even with RDB snapshots, a crash between snapshots loses up to 15 minutes of cache data. This is acceptable for our use case (caches are rebuilt from PostgreSQL), but session tokens lost on restart force users to re-authenticate.
- **Single point of failure (V1)**: The single-node configuration means a Redis outage degrades the entire application. Mitigation: implement graceful fallback to direct PostgreSQL queries when Redis is unavailable, with circuit breaker patterns.
- **Memory constraints**: The `cache.t4g.micro` instance has only 0.5 GB RAM. With conversation context caching for active users, memory usage must be carefully monitored. A single user's conversation context (~20 messages) consumes roughly 10-15 KB.

### Tradeoffs
We are choosing **performance and developer ergonomics** over infrastructure simplicity. The alternative — querying PostgreSQL for every session validation and rate limit check — would add 5-15ms per request and increase database load significantly during peak usage. At 500 concurrent users making AI requests, that translates to thousands of additional database queries per minute. Redis absorbs this load at a fraction of the latency and frees PostgreSQL to focus on transactional writes and complex queries. The $12/month cost is negligible relative to the performance benefit. The data loss risk is mitigated by treating Redis as a cache (not a source of truth) and implementing PostgreSQL fallback paths for all cached data.
