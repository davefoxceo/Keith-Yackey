# ADR-011: Conversation Context Management Strategy

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Coach Keith AI relies on Claude as its underlying LLM, which operates within finite context windows. Every API call to Claude must include sufficient context for the model to deliver personalized, framework-aware coaching responses. This context includes the user's profile (name, wife's name, children, marriage stage), the current state of all Five Dials (Self, Marriage, Parenting, Business, Faith), the user's conversation history, and any relevant RAG-retrieved content from Keith's teachings. Without careful management, context can either exceed token limits (causing truncation or errors) or underutilize the window (missing personalization opportunities). The challenge is balancing comprehensive context with token efficiency, especially as conversations grow longer over multi-session engagements.

**Decision:**
Implement a sliding window strategy with periodic summarization, governed by a strict token budget allocation:

- **System prompt (~8K tokens):** Keith's persona, voice guidelines, active frameworks, mode-specific instructions, and safety guardrails. This is largely static per conversation mode but versioned in the prompt registry (see ADR-014).
- **User profile and Five Dials state (~4K tokens):** Always included in full. Contains structured data: user demographics, marriage stage classification, current dial scores, recent assessment deltas, and AI memory notes. Pulled from the user profile service at conversation start and refreshed if an assessment occurs mid-conversation.
- **RAG content (~4K tokens):** Retrieved teaching chunks relevant to the current conversation topic. Uses cosine similarity search against the Pinecone vector store, returning the top 3-5 chunks. Chunks are pre-formatted with source attribution (episode number, timestamp, or ebook section).
- **Conversation history (~8K tokens):** The last 10 messages are kept verbatim (user + assistant pairs). When the conversation exceeds 10 exchanges, older messages are summarized using a lightweight Claude Haiku call that produces a compressed narrative summary (~500 tokens). This summary is prepended to the conversation history block and updated every 5 additional exchanges.

Total context budget per request: approximately 24K tokens, well within Claude Sonnet's 200K context window but optimized for cost and latency. The remaining window capacity serves as headroom for the model's reasoning and response generation.

Context assembly happens in the conversation orchestration service, which constructs the final prompt payload by combining all four blocks. A token counting utility (using `tiktoken` or Anthropic's token counting API) validates the assembled prompt stays within budget before submission.

**Consequences:**

### Pros (+)
- Ensures every response is fully personalized with user context and relevant teachings
- Predictable token costs per request due to strict budget allocation
- Sliding window prevents unbounded context growth in long conversations
- Summarization preserves conversational continuity without sacrificing older context entirely
- Headroom in context window allows for complex multi-turn reasoning

### Cons (-)
- Summarization introduces a small additional latency and cost (Haiku call every ~5 exchanges)
- Compressed summaries may lose nuance from earlier conversation turns
- Token budget allocation is somewhat rigid and may need tuning per conversation mode
- Requires maintaining a token counting utility that stays synchronized with Anthropic's tokenizer

### Tradeoffs
The primary tradeoff is **context quality over token cost**. We prioritize always including the full user profile and dial state (even though this consumes ~4K tokens every request) because personalization is the core value proposition. We accept the marginal cost of summarization calls because conversational continuity directly impacts coaching effectiveness. The fixed budget allocation means some modes (e.g., deep dive coaching) may feel constrained, but this can be adjusted per-mode in future iterations without architectural changes.
