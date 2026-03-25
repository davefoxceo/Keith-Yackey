# ADR-014: Prompt Engineering and System Prompt Management

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The system prompt is the single most important artifact in the Coach Keith AI. It defines Keith's voice, coaching methodology, framework application, safety boundaries, and response style. The prompt must incorporate dynamic elements (user profile, dial state, conversation mode) while maintaining consistency with Keith's brand. As the product evolves, prompts will need iterative refinement based on user feedback, Keith's review, and A/B testing of different approaches. Without a structured management system, prompt changes risk introducing regressions, losing Keith's authentic voice, or deploying untested variations to all users simultaneously.

**Decision:**
Implement a prompt registry service with version control, template composition, and A/B testing capabilities.

**Prompt Registry Architecture:**
- PostgreSQL table `prompt_templates` with columns: `id`, `name` (e.g., "coaching-mode-v3"), `version` (semver), `template_body` (text with `{{variable}}` placeholders), `variables_schema` (JSONB defining expected variables and types), `status` (draft/review/active/deprecated), `created_by`, `approved_by`, `created_at`, `activated_at`
- Each prompt is composed of reusable sections stored in `prompt_sections` table: persona, frameworks, safety, mode-specific instructions, user context template
- Final prompt assembled by the orchestration service: `base_persona` + `mode_instructions` + `safety_guardrails` + `user_context` + `rag_context` + `conversation_history`

**Variable Injection:**
- Template variables use Handlebars-style syntax: `{{user.firstName}}`, `{{dials.marriage.score}}`, `{{mode.name}}`
- Variables resolved at runtime from user profile service, assessment service, and conversation metadata
- Strict validation: missing required variables throw errors, preventing malformed prompts from reaching the API
- Example template snippet:
  ```
  You are Coach Keith, speaking with {{user.firstName}}. They are in the {{user.marriageStage}} stage of marriage.
  Their current Five Dials: Self={{dials.self}}, Marriage={{dials.marriage}}, Parenting={{dials.parenting}},
  Business={{dials.business}}, Faith={{dials.faith}}.
  ```

**Version Control and Approval Flow:**
1. Developer or prompt engineer creates new prompt version (status: `draft`)
2. Internal testing against a suite of test conversations (automated regression checks)
3. Keith reviews and approves (status: `review` -> `active`)
4. Previous version marked as `deprecated` but retained for rollback
5. All prompt versions are immutable once activated — changes require a new version
6. Git-based backup: prompt templates exported to repository on each version change

**A/B Testing via Feature Flags:**
- Integration with feature flag service (LaunchDarkly or simple database-backed flags)
- A/B test definition: `prompt_ab_tests` table with `test_name`, `variant_a_prompt_id`, `variant_b_prompt_id`, `traffic_split` (percentage), `start_date`, `end_date`, `metric` (satisfaction_score, engagement_rate, etc.)
- Users consistently assigned to the same variant for the duration of a test (hash of user_id)
- Test results tracked via conversation feedback ratings and engagement metrics

**Keith's Voice Calibration:**
- Dedicated "voice profile" section of the prompt with specific language patterns, catchphrases, and coaching style directives
- Example directives: "Use direct, no-BS language", "Reference personal stories from Keith's marriage", "Challenge the user's excuses while maintaining empathy", "Use sports and business metaphors"
- Voice profile versioned independently from mode-specific instructions

**Consequences:**

### Pros (+)
- Full audit trail of every prompt version deployed to production
- Keith maintains approval authority over all prompt changes
- A/B testing enables data-driven prompt optimization
- Template composition prevents duplication across conversation modes
- Rollback capability provides safety net for prompt regressions
- Variable validation prevents runtime prompt assembly errors

### Cons (-)
- Additional infrastructure (prompt registry, approval workflow) adds development complexity
- Approval flow may slow down iteration speed if Keith is unavailable for review
- A/B testing requires sufficient conversation volume to reach statistical significance
- Template composition can make the final assembled prompt harder to read and debug

### Tradeoffs
The primary tradeoff is **flexibility and quality control over simplicity**. Hard-coding prompts in the application code would be simpler initially but would make iteration dangerous and Keith's oversight impossible. The registry approach treats prompts as first-class configuration artifacts, which is appropriate given that prompt quality directly determines product quality. The approval workflow intentionally introduces friction — this is a feature, not a bug, because a poorly worded prompt can damage the user experience for every affected conversation.
