# ADR-013: AI Safety and Content Guardrails

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
Coach Keith AI serves men navigating sensitive marriage and relationship challenges. Conversations may involve emotional distress, marital conflict, infidelity, divorce considerations, mental health struggles, and in rare cases, domestic violence or suicidal ideation. The AI must never provide advice that could be used to manipulate a spouse, escalate conflict, or replace professional crisis intervention. Additionally, Keith's coaching philosophy is rooted in personal accountability and faith-based principles — the AI must stay aligned with his methodology and never contradict his core teachings. Regulatory considerations (potential future AI regulation) and platform liability also necessitate robust safety measures.

**Decision:**
Implement a multi-layer safety architecture with four distinct defense mechanisms:

**Layer 1 — System Prompt Guardrails (Always Active):**
- Hard-coded boundaries in every system prompt:
  - "You are not a licensed therapist or counselor. You are an AI coaching assistant."
  - "Never provide legal, medical, or psychiatric advice."
  - "Never suggest manipulation tactics, deception, or coercive strategies."
  - "If a user expresses thoughts of self-harm or harm to others, immediately provide crisis resources."
  - "Always frame advice through Keith's framework of personal ownership and the Five Dials."
- Explicit instruction to redirect to human professionals when topics exceed coaching scope
- Disclaimer generation: AI includes a brief disclaimer in first message of every conversation

**Layer 2 — Pre-Response Safety Classifier (~50ms added latency):**
- Before generating the main coaching response, the user's message is sent to Claude Haiku 3.5 with a classification-only prompt
- Classification categories: `safe`, `sensitive` (proceed with extra care), `crisis` (trigger escalation), `out_of_scope` (redirect)
- For `sensitive` messages: additional context injected into the main prompt instructing the model to be especially careful, empathetic, and to suggest professional resources
- For `crisis` messages: bypass normal response flow entirely (see Layer 3)
- For `out_of_scope` messages: model responds with a gentle redirect to appropriate resources
- Haiku classifier cost: ~$0.001 per check, negligible at scale

**Layer 3 — Crisis Detection and Auto-Escalation:**
- Keyword and pattern matching (regex-based, runs before API call):
  - Suicide-related: "kill myself", "end it all", "don't want to live", "suicidal"
  - Violence-related: "hurt her", "hit", "weapon", "restraining order"
  - Abuse indicators: "he hits me", "she's afraid", "controlling"
- On crisis detection:
  - Immediate response with crisis hotline numbers (988 Suicide & Crisis Lifeline, National Domestic Violence Hotline: 1-800-799-7233)
  - Conversation flagged in database with `crisis_detected` status
  - Alert sent to admin notification channel (Slack webhook or email)
  - Conversation can continue but all subsequent messages in that session include crisis resources in the system prompt
- Crisis keyword list maintained in configuration (not hard-coded) for easy updates

**Layer 4 — Post-Deployment Human Review Sampling:**
- 5% of all conversations randomly sampled for human review
- 100% of conversations flagged as `sensitive` or `crisis` reviewed within 24 hours
- Review dashboard shows conversation transcript, safety classifications, and user feedback
- Reviewers can flag issues that feed back into prompt improvements and keyword list updates
- Monthly safety audit report generated for Keith's review

**Additional Safeguards:**
- Rate limiting: Maximum 50 messages per user per day to prevent obsessive usage patterns
- Content filtering on user inputs: Block injection attempts that try to override system prompts
- Response length limits: Cap responses at 1,500 tokens to prevent rambling or hallucination in long outputs
- User-reported concerns: In-app "Report a Problem" button that flags conversations for immediate review

**Consequences:**

### Pros (+)
- Multiple independent layers mean no single point of failure in safety
- Crisis detection operates even if the AI model produces an unsafe response
- Human review loop enables continuous improvement of safety measures
- Haiku classifier is fast and cheap enough to run on every message
- Keith maintains oversight through monthly audit reports

### Cons (-)
- Pre-response classifier adds ~50-100ms latency to every interaction
- Haiku classifier adds ~$0.001 per message to operational costs (at 100K messages/month = ~$100)
- Keyword-based detection can produce false positives (e.g., discussing a movie plot)
- 5% sampling may miss problematic conversations that fall outside the sample
- Safety layers may occasionally make the AI feel overly cautious or clinical

### Tradeoffs
The primary tradeoff is **safety over latency and cost**. Every message incurs the overhead of keyword scanning and Haiku classification, even when the vast majority of messages are benign coaching conversations. We accept this cost because a single harmful interaction could cause real damage to a vulnerable user and significant reputational harm to Keith's brand. The system is designed to err on the side of caution — a false positive (unnecessary crisis escalation) is far less harmful than a false negative (missed crisis).
