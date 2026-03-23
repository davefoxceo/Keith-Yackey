# ADR-008: LLM Provider and Model Strategy

**Status:** Proposed
**Date:** 2026-03-22

**Context:**

The Coach Keith AI coaching engine is the core product differentiator. It must embody Keith Yackey's coaching voice, philosophy, and methodology — delivering responses that feel like a conversation with Keith rather than a generic AI chatbot. The LLM selection directly impacts:

1. **Response quality** — The AI must handle sensitive topics (marriage struggles, business failures, identity crises, faith questions) with the nuance, directness, and empathy that characterize Keith's coaching style.
2. **Safety and alignment** — Coaching conversations frequently involve emotionally vulnerable users. The model must avoid harmful advice, recognize crisis situations (suicidal ideation, abuse), and escalate appropriately.
3. **Tier differentiation** — The subscription model includes Standard ($29/month) and Premium ($79/month) tiers. The AI experience must feel meaningfully different between tiers to justify the price gap.
4. **Cost management** — AI API costs are the single largest variable cost in the business model. At 5,000 subscribers, daily AI usage translates to significant monthly API spend.

We evaluated:

1. **Anthropic Claude (Sonnet + Opus)** — Strong safety features, excellent instruction following, nuanced handling of sensitive topics.
2. **OpenAI GPT-4o / GPT-4 Turbo** — Largest ecosystem, strong general performance, function calling.
3. **Google Gemini 2.0** — Competitive performance, long context window, multimodal capabilities.
4. **Multi-provider with fallback** — Use multiple providers with automatic failover.

**Decision:**

We will use **Anthropic Claude** as our exclusive LLM provider with a tiered model strategy:

| Tier | Model | Context Window | Estimated Cost/Conversation | Use Case |
|------|-------|----------------|---------------------------|----------|
| Standard ($29/mo) | **Claude Sonnet 4** | 200K tokens | $0.02-0.05 | Daily coaching, journaling prompts, general guidance |
| Premium ($79/mo) | **Claude Opus 4** | 200K tokens | $0.10-0.25 | Deep coaching sessions, complex life situations, personalized frameworks |

Integration via the **Anthropic TypeScript SDK** (`@anthropic-ai/sdk` v0.39+):

```typescript
// AI Proxy — model selection based on subscription tier
const model = user.tier === 'premium'
  ? 'claude-opus-4-20250514'
  : 'claude-sonnet-4-20250514';

const stream = await anthropic.messages.stream({
  model,
  max_tokens: 1024,
  system: assembledSystemPrompt, // Keith's voice + RAG context
  messages: conversationHistory,
  metadata: { user_id: user.id },
});
```

### Why no fallback provider

We deliberately chose **not** to implement a multi-provider fallback strategy for V1. Reasons:

1. **Prompt engineering investment**: Keith's coaching voice requires extensive system prompt engineering, few-shot examples, and behavioral guardrails. These prompts are optimized specifically for Claude's instruction-following behavior. Porting them to GPT-4o or Gemini would require separate prompt engineering effort and testing.
2. **Safety alignment**: Claude's Constitutional AI approach and built-in safety behaviors are deeply integrated into our content moderation and crisis detection strategy. A fallback to a differently-aligned model could produce inconsistent safety responses during the most critical user interactions.
3. **Consistency over availability**: Users build trust with a consistent AI coaching experience. Switching models mid-conversation (even transparently) can alter tone, style, and advice quality in ways that erode user confidence.

### Cost projections

| Scenario | Sonnet (Standard) | Opus (Premium) | Monthly Total |
|----------|-------------------|----------------|---------------|
| Year 1 (3,500 Standard + 1,500 Premium) | $2,100-5,250 | $4,500-11,250 | $6,600-16,500 |
| Year 2 (12,000 Standard + 5,000 Premium) | $7,200-18,000 | $15,000-37,500 | $22,200-55,500 |

Cost optimization strategies:
- **Prompt caching**: Use Anthropic's prompt caching for the system prompt (Keith's voice instructions + static RAG context), reducing input token costs by up to 90% for cached portions.
- **Context window management**: Limit conversation history to the most recent 20 messages + summarized earlier context, keeping input tokens under 4,000 per request.
- **Response length controls**: Set `max_tokens` based on conversation type (quick check-in: 256 tokens, deep coaching: 1024 tokens).
- **Usage monitoring**: Real-time per-user cost tracking with daily and monthly budget caps. Alert if any single user exceeds $5/day in API costs.

**Consequences:**

### Pros (+)
- **Anthropic's safety features align with sensitive content domain**: Claude's Constitutional AI training makes it particularly well-suited for coaching conversations involving mental health, relationship struggles, and personal crisis. Claude is less likely to provide harmful advice and more likely to recognize when professional help is needed.
- **Opus quality justifies Premium pricing**: Claude Opus produces noticeably more nuanced, empathetic, and contextually aware responses than Sonnet. This quality gap is perceptible to users and provides clear justification for the $79/month Premium tier — the AI coaching experience genuinely improves.
- **Simpler integration and testing**: A single provider means one SDK, one authentication flow, one rate limit strategy, one set of error handling patterns, and one prompt engineering framework. This dramatically reduces complexity for a small team.
- **Prompt caching reduces costs significantly**: Anthropic's prompt caching feature is uniquely well-suited for our use case. Keith's system prompt (~2,000 tokens) and static content context are identical across all users and can be cached, reducing per-request input costs by up to 90%.
- **Streaming support**: Claude's streaming API enables token-by-token response delivery, creating a responsive "typing" experience that mimics real-time conversation with a human coach.

### Cons (-)
- **Single vendor dependency**: If Anthropic experiences extended outages, pricing changes, or model deprecations, the entire coaching experience is unavailable. There is no automatic fallback. Anthropic's historical uptime is 99.9%+, but outages do occur (typically 1-2 per quarter, lasting 30-120 minutes).
- **Opus cost is ~5x Sonnet**: At $15/M input and $75/M output tokens (Opus) vs $3/M input and $15/M output (Sonnet), Premium tier API costs are substantial. If Premium users average 5+ deep coaching sessions daily, per-user API cost could exceed $7.50/month — approaching the margin limit.
- **No fallback on outage**: During an Anthropic outage, Premium users paying $79/month have no AI coaching access. Mitigation: implement a "coaching queue" that stores user messages and delivers AI responses when the API recovers, plus pre-generated daily coaching content that works offline.
- **Model version migration risk**: When Anthropic releases new model versions, prompts may need re-tuning. The coaching voice that works well on `claude-sonnet-4-20250514` may behave differently on the next version. Requires regression testing on every model upgrade.

### Tradeoffs
We are choosing **quality and safety alignment** over **cost optimization and redundancy**. The single-vendor strategy accepts the risk of Anthropic outages (mitigated by offline content and message queuing) in exchange for a consistent, high-quality coaching experience that leverages Claude's unique safety properties. The cost premium of Opus for Premium users is offset by the significantly higher subscription price ($79 vs $29). As the user base grows and Claude API costs become a larger portion of revenue, we will revisit multi-provider strategies — but only if we can maintain equivalent safety and quality standards across providers.
