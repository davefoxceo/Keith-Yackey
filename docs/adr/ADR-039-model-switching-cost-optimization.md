# ADR-039: Model Switching and Cost Optimization

**Status:** Proposed
**Date:** 2026-03-24

## Context

Coach Keith AI currently sends every user message to Claude Sonnet regardless of complexity. A greeting like "Hey Keith" costs the same as a multi-turn crisis intervention about infidelity disclosure. At scale (1,000+ active users), this becomes the single largest operating cost. Analysis of demo conversations shows roughly 70% of messages are simple (greetings, single-topic factual questions, acknowledgments), 25% are standard coaching conversations, and 5% are complex crisis or multi-turn deep coaching sessions.

The existing `SafetyGuardrails` module already classifies messages for crisis detection. That classification logic can be extended to serve as the complexity router, avoiding a second classification pass.

## Decision

Implement a **ModelRouter** service that wraps the Anthropic client and routes each message to the appropriate Claude model based on estimated complexity.

### Tier Definitions

| Tier | Model | Cost/msg (approx) | Use Cases |
|------|-------|--------------------|-----------|
| **Simple** | Claude Haiku | ~$0.001 | Greetings, acknowledgments, factual lookups ("what are the 5 dials?"), single-turn Q&A |
| **Standard** | Claude Sonnet | ~$0.01 | Coaching conversations, assessment follow-ups, challenge guidance, multi-turn dialogue |
| **Complex** | Claude Opus | ~$0.05 | Crisis situations (flagged by SafetyGuardrails), deep multi-turn coaching, relationship repair plans, situations involving safety concerns |

### Classification Logic

The classifier runs before the LLM call and uses a fast heuristic pipeline (no LLM needed for classification itself):

1. **Crisis check first** -- if `SafetyGuardrails.classify()` returns `crisis` or `safety_concern`, route to Opus immediately. This is the existing detection for self-harm language, abuse indicators, and acute distress.
2. **Simple detection** -- keyword and pattern matching:
   - Message length under 20 tokens AND no question mark = likely acknowledgment (Haiku)
   - Message matches greeting patterns (`/^(hey|hi|hello|what's up|sup)/i`) = Haiku
   - Message is a direct factual question about Keith's framework with no emotional content = Haiku
   - Conversation turn count is 1 (first message in session) and is a greeting = Haiku
3. **Standard (default)** -- everything else routes to Sonnet.

### Fallback Behavior

- If the classifier throws an error or returns undefined, default to **Sonnet** (current behavior, no regression).
- If Opus is unavailable or rate-limited, fall back to Sonnet with a flag in the response metadata indicating degraded routing.
- If Haiku produces a response the user rates poorly (thumbs down), the next message in that conversation escalates to Sonnet.

## Implementation

### ModelRouter Service

```
src/services/model-router.ts
```

- `classifyComplexity(message, conversationHistory, safetyResult) -> 'simple' | 'standard' | 'complex'`
- `getModelForComplexity(complexity) -> string` (returns model ID)
- `routeAndCall(message, conversationHistory) -> AnthropicResponse`
- All routing decisions logged to analytics events for tuning

### System Prompt Adjustment

Each tier gets a slightly different system prompt prefix:
- **Haiku**: Shorter system prompt, Keith's voice but concise responses, no deep coaching
- **Sonnet**: Full system prompt with coaching methodology
- **Opus**: Full system prompt plus crisis-aware instructions, extended reasoning allowance

### Cost Tracking

Add a `model_used` field to every message record. Build a daily cost report:
- Messages per tier per day
- Actual vs. projected cost
- Misclassification rate (user escalations from Haiku to Sonnet)

## Consequences

### Positive

- **60-75% cost reduction** based on message distribution (70% simple at $0.001 vs. $0.01 saves ~$6.30 per 1,000 messages)
- Crisis situations get the most capable model without manual intervention
- Simple questions get faster responses (Haiku latency is lower)
- Cost tracking provides visibility into usage patterns

### Negative

- Added complexity in the request pipeline (one more service to maintain)
- Risk of misclassification: a serious message routed to Haiku could produce an inadequate response
- Three different model behaviors mean three sets of response characteristics to QA
- System prompt management becomes more complex (3 variants to maintain)

### Mitigations

- Conservative classification: when in doubt, route to Sonnet (never downgrade ambiguous messages)
- Monitor misclassification rate weekly; tune heuristics based on user feedback signals
- Haiku responses include a subtle "need more help?" prompt to catch under-routed messages
- A/B test for 2 weeks before full rollout: 50% of users get model routing, 50% stay on Sonnet-only
