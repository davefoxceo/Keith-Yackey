# ADR-027: Monitoring, Observability, and Alerting

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Coach Keith AI app has a complex backend spanning NestJS API services, PostgreSQL, Redis, S3, Lambda functions, and — critically — external AI API dependencies (Anthropic Claude). Observability is essential for maintaining reliability, debugging issues, and understanding system behavior. AI-specific monitoring is a first-class concern: we need to track not just uptime and latency but also response quality, RAG retrieval relevance, conversation sentiment trends, and token usage for cost management. We evaluated Datadog (comprehensive but expensive at $15-23/host/month + $0.10/GB logs), New Relic (similar pricing tier), AWS CloudWatch (limited dashboarding and correlation), and Grafana Cloud (generous free tier, cost-effective scaling, open-source ecosystem).

**Decision:**
We will use Grafana Cloud as our unified observability platform for metrics, logs, and distributed traces, with PagerDuty for on-call alerting and incident management.

1. **Metrics (Grafana Cloud - Prometheus):** Application metrics are exported via `prom-client` (v15) in the NestJS backend. Standard metrics include HTTP request rate, latency percentiles (p50, p95, p99), error rates by endpoint, and database query duration. AI-specific custom metrics include:
   - `ai_response_latency_seconds` (histogram) — Claude API response time by model tier
   - `ai_token_usage_total` (counter) — input and output tokens by model, labeled by feature (coaching, moderation, content generation)
   - `rag_retrieval_relevance_score` (histogram) — cosine similarity scores from Pinecone vector search, bucketed to track retrieval quality
   - `conversation_sentiment_score` (gauge) — rolling sentiment analysis of user messages to detect frustration or disengagement
   - `ai_fallback_triggered_total` (counter) — count of times the circuit breaker activated and fallback responses were served
   - `coaching_session_completion_rate` (gauge) — percentage of started coaching conversations that reach a natural conclusion

2. **Logs (Grafana Cloud - Loki):** Structured JSON logs via `winston` (v3.11) with Loki push via `winston-loki` transport. Log levels follow standard severity (error, warn, info, debug). All AI interactions are logged at `info` level with request/response metadata (model, tokens, latency, conversation_id) for debugging and quality analysis. PII is stripped from logs via a custom winston transform before shipping.

3. **Traces (Grafana Cloud - Tempo):** Distributed tracing via OpenTelemetry SDK (`@opentelemetry/sdk-node` v0.52+) with automatic instrumentation for HTTP, PostgreSQL (`pg`), Redis (`ioredis`), and manual spans for Claude API calls and Pinecone queries. Trace context is propagated via W3C Trace Context headers. This enables end-to-end latency analysis for complex flows like "user sends message -> RAG retrieval -> Claude API call -> response formatting -> WebSocket push."

4. **Dashboards:** Pre-built Grafana dashboards include:
   - **System Health:** Request rate, error rate, latency percentiles, CPU/memory utilization
   - **AI Operations:** Claude API latency, token usage, cost projections, fallback trigger rate
   - **RAG Quality:** Retrieval relevance score distribution, cache hit rates, embedding generation latency
   - **User Engagement:** Active coaching sessions, message volume, community post rate, sentiment trends
   - **Cost Tracking:** Estimated daily/monthly AI API costs by feature, projected vs. actual spend

5. **Alerting (PagerDuty):** Grafana alerting rules trigger PagerDuty incidents for critical conditions: error rate > 5% for 5 minutes, Claude API latency p95 > 10 seconds, circuit breaker open for > 2 minutes, database connection pool exhaustion, and RAG relevance score p50 dropping below 0.6 (indicating embedding or retrieval degradation). Non-critical alerts (e.g., token usage approaching budget thresholds) route to Slack via Grafana webhook.

**Consequences:**

### Pros (+)
- Grafana Cloud free tier covers up to 10K metrics, 50GB logs, and 50GB traces per month — sufficient for early-stage operations
- Unified platform for metrics, logs, and traces eliminates context-switching between tools
- AI-specific dashboards provide visibility into the unique operational concerns of an AI-powered app
- OpenTelemetry instrumentation is vendor-neutral, allowing migration if needed
- PagerDuty provides robust on-call scheduling, escalation policies, and incident timeline

### Cons (-)
- Grafana Cloud lacks some of Datadog's advanced features: APM code-level profiling, AI-specific integrations (LLM Observability), and network performance monitoring
- Loki's query language (LogQL) has a steeper learning curve than Datadog's log search
- Custom AI metrics require manual instrumentation — no out-of-the-box LLM monitoring like Datadog or LangSmith
- PagerDuty adds a separate vendor to manage ($21/user/month for Professional plan)

### Tradeoffs
We chose Grafana Cloud's cost-effectiveness and open-source ecosystem over Datadog's richer feature set. Datadog's LLM Observability product would provide out-of-the-box monitoring for Claude API calls, but at significantly higher cost (~3-5x for equivalent metrics, logs, and traces volume). For a startup, Grafana Cloud's generous free tier and predictable scaling costs are more appropriate. The tradeoff is more manual instrumentation work for AI-specific metrics, which we accept as a one-time development investment that gives us exactly the metrics we need rather than a generic LLM monitoring view.
