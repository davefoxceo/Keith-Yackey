# ADR-048: Multi-Language Translation

**Status:** Proposed
**Date:** 2026-03-24

## Context

Coach Keith's app is currently English-only, limiting the addressable market to English-speaking men. Keith's coaching philosophy -- showing up as a man across five key life areas -- resonates universally, but the language barrier prevents global expansion. The largest near-term opportunity is Spanish-speaking users: the US Hispanic male population is over 30 million, and Latin America represents a massive untapped market for men's coaching content.

Traditional app localization uses pre-translated static string files (i18n), which works for UI labels but fails for an AI coaching product. The core value of Coach Keith AI is the dynamic conversation -- Keith's voice, his directness, his specific coaching frameworks. These cannot be pre-translated. The AI's responses must be generated in the target language while preserving Keith's personality, idioms, and coaching style.

The approach combines standard i18n for static UI strings with real-time AI translation for dynamic content (coaching responses, content library, challenges).

## Decision

Implement a **hybrid translation system** that uses i18n frameworks for static UI and Claude's native multilingual capabilities for dynamic AI-generated content.

### Language Rollout Phases

| Phase | Languages | Target Date | Rationale |
|-------|-----------|-------------|-----------|
| **Phase 1** | English (default), Spanish | Q3 2026 | Largest US non-English market + Latin America |
| **Phase 2** | Portuguese (Brazil), French | Q1 2027 | Brazil is largest Latin American market; French covers West Africa + Canada |
| **Phase 3** | German, Japanese | Q3 2027 | Strong men's coaching markets in DACH region and Japan |

### Translation Architecture

The system has three translation layers, each handling a different type of content:

#### Layer 1: Static UI Strings (i18n)

Standard internationalization using `next-intl` for all fixed UI text:

- Navigation labels, button text, form labels, error messages
- Assessment question text and scale anchors
- Milestone names and descriptions
- Belt names and level descriptions
- Tooltip text (ADR-033)

Translation workflow:
1. English string keys defined in `messages/en.json`
2. Professional human translators produce `messages/es.json`, `messages/pt-BR.json`, etc.
3. `next-intl` loads the correct message file based on user's language preference
4. Locale detected from browser on first visit, user can override in settings

```
messages/
  en.json       -- English (source of truth)
  es.json       -- Spanish
  pt-BR.json    -- Brazilian Portuguese
  fr.json       -- French
  de.json       -- German
  ja.json       -- Japanese
```

#### Layer 2: AI Coaching Responses (Real-Time Translation via Claude)

Coach Keith's AI responses are generated directly in the target language by adding a translation instruction to the system prompt:

```
System prompt addition (for Spanish user):
"Respond in Spanish. Maintain Keith's direct, challenging, warm coaching style.
Use 'hermano' for 'brother'. Use informal 'tu' form, not formal 'usted'.
Preserve Keith's coaching frameworks (Five Dials, HEAR method) in English
as proper nouns -- do not translate framework names."
```

This approach is superior to post-hoc translation because:
- Claude generates natively in the target language (no translation artifacts)
- Keith's personality traits (directness, warmth, challenge) are preserved by instruction
- Framework terms stay in English as brand identifiers
- No additional API call -- the response is simply generated in a different language

#### Layer 3: Content Library (On-Demand Translation with Caching)

Content library items (episode summaries, coaching resources, book excerpts) are translated on first request and cached:

1. User requests a content item in Spanish
2. System checks cache for Spanish version
3. If not cached: Claude translates the English source, result stored in DataStore
4. If cached: serve directly
5. Cache invalidated when English source content is updated

Content translation uses a dedicated prompt optimized for accuracy rather than personality -- these are reference materials, not coaching conversations.

### Cultural Adaptation

Translation alone is insufficient. Coaching concepts require cultural sensitivity:

| Element | English | Cultural Consideration |
|---------|---------|----------------------|
| "Brother" | "Hermano" (Spanish) | Works well -- same fraternal energy |
| Partner dial (intimacy tracking) | Varies by culture | Some cultures are more private about intimacy; assessment framing may need softening |
| Faith dial | Varies by culture | "Faith" must be broad enough for Catholic, Evangelical, secular spirituality contexts |
| Fatherhood dial | Varies by culture | Single-father and extended-family dynamics differ significantly across cultures |
| Keith's directness | Varies by culture | Japanese culture may find Keith's confrontational style uncomfortable; tone needs calibration per locale |

Assessment questions receive cultural adaptation, not just translation:
- A professional translator with cultural expertise reviews each assessment question
- Some questions may be reworded (not just translated) for cultural relevance
- Scoring scales remain identical to maintain data comparability

### Voice Mode Integration (ADR-045)

ElevenLabs supports multilingual voice cloning. Keith's cloned voice can speak Spanish, Portuguese, and other supported languages. The same voice model is used, with ElevenLabs handling the pronunciation and cadence for each language. This means a Spanish-speaking user hears Keith's voice speaking Spanish -- not a different voice.

### Admin Dashboard

The admin dashboard remains English-only. Keith speaks English, and the admin tools are for his personal use. User-generated content visible in admin (conversation transcripts, assessment responses) is displayed in the original language with an optional "Translate to English" button.

### Language Settings

- **Detection**: browser `Accept-Language` header on first visit
- **User override**: language selector in Settings page
- **Persistence**: stored in user profile, applied across all sessions and devices
- **Fallback**: if a translation is missing, fall back to English with a small indicator badge

## Implementation

```
src/services/translation.service.ts    -- translation orchestration and caching
src/i18n/config.ts                     -- next-intl configuration and locale setup
messages/en.json                       -- English source strings
messages/es.json                       -- Spanish translations
src/middleware.ts                      -- locale detection middleware
```

### TranslationService API

- `translateContent(contentId, targetLocale) -> string` -- translates content item with caching
- `getLocaleConfig(locale) -> LocaleConfig` -- returns cultural adaptation rules for a locale
- `getCoachedSystemPrompt(locale) -> string` -- returns locale-specific system prompt additions
- `invalidateCache(contentId) -> void` -- clears cached translations when source changes
- `getTranslationCoverage(locale) -> { static: number, content: number }` -- percentage of strings translated

### Estimated Translation Effort

| Language | Static Strings (est.) | Content Items (est.) | Professional Review |
|----------|----------------------|---------------------|-------------------|
| Spanish | ~800 strings | ~200 items | 2-3 weeks |
| Portuguese | ~800 strings | ~200 items | 2-3 weeks |
| French | ~800 strings | ~200 items | 2-3 weeks |
| German | ~800 strings | ~200 items | 2-3 weeks |
| Japanese | ~800 strings | ~200 items | 3-4 weeks (CJK complexity) |

## Consequences

### Positive

- Opens the app to a global market of men who need coaching but cannot access it in English
- AI-native translation approach means coaching quality is maintained across languages without separate AI models
- Cached content translation keeps costs predictable after initial translation pass
- Framework terms preserved in English maintain brand consistency worldwide
- Voice mode in multiple languages creates a differentiated product no competitor offers

### Negative

- Professional human translation of static strings is an ongoing cost as the app evolves
- Claude's coaching quality may vary across languages -- less training data in some languages means subtler personality nuances may be lost
- Cultural adaptation requires domain expertise that is difficult to validate at scale
- Supporting multiple languages increases QA surface area significantly
- Right-to-left languages (Arabic, Hebrew) would require layout changes (not in current roadmap)

### Mitigations

- Launch Spanish first as a controlled pilot: recruit 50 Spanish-speaking beta testers and gather qualitative feedback on Keith's personality preservation
- Use bilingual coaching professionals to review AI response samples in each language before launch
- Implement a "Report translation issue" button that lets users flag responses that feel unnatural
- Maintain a per-language style guide documenting how Keith's key phrases and coaching concepts should be expressed
- Delay RTL language support until the product is proven in LTR markets
