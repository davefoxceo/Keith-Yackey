# ADR-002: Backend Runtime and Language

**Status:** Proposed
**Date:** 2026-03-22

**Context:**

The Coach Keith AI backend must support multiple workloads simultaneously:

1. **AI Proxy Layer** — Accepts user messages, assembles context (conversation history, RAG results, user profile), proxies requests to Claude API, and streams responses back to the client via Server-Sent Events (SSE) or WebSockets.
2. **REST API** — Standard CRUD operations for user profiles, assessments, content library, subscription management, and admin endpoints.
3. **WebSocket Server** — Real-time features including typing indicators, coach availability status, and live session sync.
4. **Content Pipeline** — Background workers for podcast transcription, Instagram content ingestion, embedding generation, and content chunk indexing.

The team evaluated Node.js (TypeScript), Python (FastAPI), Go, and Rust. The founding backend engineer has deep TypeScript experience. The AI proxy workload is I/O-bound (waiting on Claude API responses), not CPU-bound, which favors Node.js's event loop model.

**Decision:**

We will use **Node.js 22 LTS** with **TypeScript 5.5+** (strict mode) running the **NestJS v11** framework. Key architectural choices:

- **NestJS** provides opinionated structure with dependency injection, decorators, guards, interceptors, and pipes — critical for a team that will scale from 1 to 3-5 backend engineers.
- **Fastify** adapter (instead of Express) for ~2x request throughput and lower memory usage.
- **`@nestjs/websockets`** with Socket.IO for real-time features.
- **`@nestjs/bull`** with BullMQ for background job processing (content pipeline, embedding generation).
- **Zod** for runtime validation, shared with the React Native frontend via a shared types package in the monorepo.
- **Prisma ORM v6** for type-safe database access with PostgreSQL.
- **`@anthropic-ai/sdk`** (official Anthropic TypeScript SDK) for Claude API integration with streaming support.

The project will be structured as an **Nx monorepo** with the following packages:
- `apps/api` — NestJS application
- `apps/mobile` — React Native (Expo) application
- `packages/shared` — Shared types, Zod schemas, constants
- `packages/ai-core` — AI prompt templates, context assembly, RAG utilities

**Consequences:**

### Pros (+)
- **TypeScript everywhere**: A single language across frontend, backend, and shared packages eliminates context switching, enables shared validation schemas, and allows full-stack engineers to contribute across the entire codebase.
- **Excellent I/O performance for AI proxy**: Node.js's non-blocking event loop is ideal for the primary workload — waiting on Claude API responses (often 2-10 seconds) while handling concurrent users. A single Node.js process can efficiently manage hundreds of concurrent streaming connections.
- **NestJS provides enterprise structure**: Dependency injection, module boundaries, guards for auth, interceptors for logging/metrics, and pipes for validation enforce consistent patterns as the team grows.
- **Rich ecosystem**: First-class support for Stripe (`stripe-node`), AWS SDK v3, Anthropic SDK, Redis (`ioredis`), and every other integration we need.
- **Streaming support**: Node.js streams and async iterators map naturally to Claude's streaming API responses and SSE delivery to clients.

### Cons (-)
- **Not ideal for CPU-intensive tasks**: Embedding generation, text chunking, and audio transcription preprocessing can block the event loop. These must be offloaded to BullMQ workers running in separate processes or delegated to Lambda functions.
- **Single-threaded event loop**: While Node.js handles I/O concurrency well, a single malformed request handler that blocks synchronously can degrade the entire process. Requires disciplined async patterns and monitoring.
- **Memory overhead at scale**: Node.js processes consume more memory per instance than Go or Rust equivalents. For our projected ~5,000 subscriber scale in Year 1, this is a non-issue, but may require horizontal scaling earlier than a Go-based alternative.
- **NestJS learning curve**: Developers unfamiliar with Angular-style decorators and DI may need onboarding time.

### Tradeoffs
We are explicitly choosing **developer velocity and hiring efficiency** over raw runtime performance. At our projected scale (5,000 subscribers, ~500 concurrent users at peak), a well-optimized Node.js application on ECS Fargate will handle the load comfortably on 2-4 instances. The cost of Node.js's higher per-instance memory usage is negligible compared to the Claude API costs that will dominate our infrastructure spend. If CPU-intensive workloads (e.g., on-device model inference) become critical in Phase 3+, we can introduce Go or Rust microservices for those specific tasks without rewriting the core API.
