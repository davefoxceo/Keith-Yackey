# Product Requirements Document (PRD)
## Coach Keith AI — Mobile Application
### Version 1.0 | March 2026

---

## 1. Executive Summary

**Product Name:** Coach Keith AI
**Product Type:** iOS & Android Mobile Application
**Target User:** Married men (25-55) seeking to restore attraction, intimacy, and connection in their marriages
**Business Model:** Monthly subscription ($29.99/mo Standard, $79.99/mo Premium with live elements)
**Elevator Pitch:** The world's first AI marriage coach for men — powered by Keith Yackey's proven Five Dials Framework, Married Game methodology, and thousands of hours of coaching wisdom. Every man gets a personal "Coach Keith" in his pocket, available 24/7 to help him become the most attractive version of himself.

### Why This Exists

Keith Yackey has personally coached hundreds of men through marriage transformation. His GPT ("Coach Keith") on ChatGPT proves the demand — men want on-demand access to Keith's frameworks. But a generic GPT lacks personalization, progress tracking, accountability, community, and the depth of Keith's full methodology. A purpose-built mobile app bridges this gap, turning Keith's coaching into a scalable, deeply personalized product that can reach millions of men.

---

## 2. Problem Statement

### The Man's Marriage Crisis
- **70% of divorces are initiated by women.** Most men don't see it coming.
- Men have been conditioned to believe **three core lies**: (1) "I married the wrong woman," (2) "Women aren't into sex," (3) "Men are perverts for wanting sex."
- High-performing men succeed at business but fail at home — they become **boring, predictable, and friend-zoned in their own marriage.**
- Most marriage counseling is couples-focused. Very few resources exist that speak directly to men about becoming attractive again.
- Keith's coaching costs thousands of dollars and is limited by his personal bandwidth. The GPT is free but shallow. There's a massive gap in the middle.

### Why a GPT Isn't Enough
| GPT Limitation | Coach Keith AI Solution |
|---|---|
| No memory between sessions | Persistent user profile & marriage journey |
| Generic responses | Trained on Keith's exact voice, frameworks, stories |
| No accountability | Daily check-ins, streak tracking, 5 Dials scoring |
| No community | Brotherhood feed, anonymous Q&A, shared wins |
| No multimedia | Podcast episodes, video clips, guided exercises |
| No progress tracking | 5 Dials dashboard, weekly assessments, trend graphs |
| No monetization for Keith | Subscription revenue, upsell to live coaching |

---

## 3. Target Users

### Primary Persona: "The Disconnected Husband"
- **Age:** 30-50
- **Income:** $75K-$300K+ (successful professionally)
- **Situation:** Marriage feels flat. Wife has pulled away. Sex is infrequent or transactional. He feels rejected but doesn't know what to do differently.
- **Mindset:** Willing to do the work but needs a framework. Too proud for traditional therapy. Responds to masculine, direct, no-BS coaching.
- **Tech:** Comfortable with apps, podcasts, and digital tools.

### Secondary Persona: "The Crisis Husband"
- **Situation:** Wife has threatened divorce or already left. He's desperate and searching for answers.
- **Need:** Immediate, actionable guidance. Emotional support without judgment. A roadmap back.

### Tertiary Persona: "The Proactive Husband"
- **Situation:** Marriage is good but he wants it to be great. He sees other men struggling and wants to stay ahead.
- **Need:** Ongoing refinement, community, accountability.

---

## 4. Keith Yackey's Core IP (Knowledge Base)

The AI must be trained on and deeply embody the following intellectual property:

### 4.1 The Five Dials Framework
The centerpiece of Keith's methodology. Each "dial" represents an area where a man must perform to be attractive to his wife:

| Dial | Name | Core Question |
|------|------|---------------|
| 1 | **Parent** | Am I actively leading as a father? Am I involved, present, and effective? |
| 2 | **Partner** | Am I her best friend and true teammate — not just a roommate? |
| 3 | **Producer** | Am I providing financial stability and contributing economically? |
| 4 | **Player** | Am I fun, playful, and spontaneous — or boring and predictable? |
| 5 | **Power** | Am I doing what I say I'll do, when I say I'll do it? Am I a man of my word? |

**Key Insight:** "Women don't want a perfect man. They want a man who is honestly assessing himself across all five dials and actively working to turn each one up."

### 4.2 The Provocateur Identity
Keith's aspirational identity for men:
- A **Provocateur** is a man who provokes admiration, desire, and commitment from his partner
- Not through manipulation — through genuine self-improvement and magnetic presence
- The opposite of the desperate, validation-seeking husband

### 4.3 The Three Lies Men Believe
1. **"I married the wrong woman"** — A cop-out that avoids self-reflection
2. **"Women aren't into sex"** — A misunderstanding of female desire (she's into sex, just not with who you've become)
3. **"Men are perverts for wanting sex"** — Shame that kills masculine confidence

### 4.4 The Mommy Matrix
A concept describing how men unconsciously shift from being their wife's lover to being another one of her children — losing masculine polarity and becoming dependent, needy, and unattractive.

### 4.5 ROI of Intimacy (Return of Intimacy)
Framework for understanding that intimacy is an investment — what you put in across the 5 Dials directly correlates to what you get back in connection, desire, and sex.

### 4.6 Core Principles
- **"Become the most attractive version of yourself — for you, not for her."**
- **"You don't have a marriage problem. You have a personal problem showing up in your marriage."**
- **"Do everything you say when you say you are going to do it without fail."**
- **Curiosity over judgment** — Ask questions, stay curious about your wife and yourself
- **Taker to giver energy** — Sustained attraction requires genuine contribution, not extraction
- **Shame is the real enemy** — Most couples struggle because of shame, not communication
- **Competition, comparison, and shame** — Reframed as features, not flaws, for masculine growth
- **Tribal accountability** — Isolation enables self-deception; brotherhood keeps men honest

### 4.7 Keith's Voice & Tone
- **Direct and unapologetic** — No sugarcoating, no tiptoeing
- **Funny** — Keith is a stand-up comedian; humor is woven into coaching
- **Empathetic but challenging** — He's been there (almost lost his marriage twice) but doesn't let men play victim
- **Story-driven** — Personal anecdotes and client stories illustrate every point
- **Masculine energy** — Speaks man-to-man, uses sports/competition metaphors
- **Provocative** — Challenges comfort zones, calls out BS, asks hard questions

---

## 5. Feature Requirements

### 5.1 AI Coach (Core Feature)

#### 5.1.1 Conversational AI Engine
- **Model:** Claude API (Anthropic) as the primary LLM
- **System Prompt:** Deeply trained on Keith's voice, frameworks, stories, podcast transcripts, book content, and coaching patterns
- **Personality:** Responds as "Coach Keith" — direct, funny, challenging, empathetic
- **Context Window:** Maintains full conversation history and user profile context
- **Conversation Modes:**
  - **Free Chat** — Open-ended coaching conversation
  - **Crisis Mode** — Activated when user indicates urgent marital distress (wife leaving, caught cheating, divorce threat). Provides immediate stabilization framework.
  - **Framework Mode** — Guided walkthroughs of specific concepts (5 Dials assessment, Mommy Matrix diagnosis, Three Lies identification)
  - **Accountability Mode** — Daily/weekly check-in structured conversations

#### 5.1.2 Personalized User Profile
- **Onboarding Assessment:** 10-15 question intake covering marriage duration, current state, biggest pain points, goals, and baseline 5 Dials self-assessment
- **Persistent Memory:** AI remembers user's situation, wife's name, kids, job, previous conversations, commitments made, and progress
- **Marriage Stage Classification:** Automatically categorizes user (Crisis / Disconnected / Rebuilding / Thriving) and adjusts coaching approach accordingly
- **Weekly Evolution:** Profile updates based on conversations and check-ins

#### 5.1.3 Conversation Starters & Prompts
Pre-built entry points for men who don't know where to start:
- "My wife and I haven't had sex in [X] weeks/months"
- "She says she loves me but isn't 'in love' with me"
- "I feel like a roommate in my own marriage"
- "She threatened to leave"
- "I don't know how to be fun anymore"
- "I keep screwing up and she won't forgive me"
- "How do I handle her anger?"
- "I want to score myself on the 5 Dials"

### 5.2 The Five Dials Dashboard

#### 5.2.1 Self-Assessment Tool
- **Weekly 5 Dials Check-in:** User rates himself 1-10 on each dial with specific behavioral anchors
- **AI-Assisted Scoring:** After conversations, AI suggests dial adjustments based on what user revealed
- **Visual Dashboard:** Radar/spider chart showing all 5 dials with historical trend lines
- **Drill-Down:** Tap any dial for specific action items, resources, and micro-challenges

#### 5.2.2 Dial-Specific Content
Each dial links to:
- Relevant podcast episodes
- Book chapters/excerpts
- AI-generated personalized action plans
- Micro-challenges (e.g., "This week: plan one surprise date that has nothing to do with dinner")

### 5.3 Daily Engagement System

#### 5.3.1 Morning Kickstart
- Push notification at user-selected time
- Short Keith-style motivational message + one actionable prompt for the day
- Examples:
  - "Today's mission: Find one thing your wife does that you've stopped noticing. Tell her you noticed. That's it. Don't overthink it."
  - "Quick gut check — which of your 5 Dials felt weakest yesterday? What's one thing you can do about it today?"

#### 5.3.2 Evening Reflection
- Optional end-of-day check-in
- 3 quick questions: "What did you do well today as a husband?" / "Where did you fall short?" / "What's one thing you're committing to tomorrow?"
- AI processes responses and adjusts coaching

#### 5.3.3 Streak & Consistency Tracking
- Daily engagement streaks (inspired by Keith's 75 Hard advocacy)
- "Days of intentional marriage" counter
- Milestone celebrations with Keith-voice encouragement

### 5.4 Content Library

#### 5.4.1 Podcast Integration
- Full Married Game Podcast archive with searchable transcripts
- AI-curated episode recommendations based on user's current situation
- "Key Moment" clips — 2-5 minute excerpts tagged by topic and dial
- In-app player with bookmarking and note-taking

#### 5.4.2 Book Content
- "The Married Game" book — full digital access for Premium subscribers
- Chapter-by-chapter guided reading with AI discussion prompts
- Key concept cards (swipeable, shareable)

#### 5.4.3 Video Content
- Keith's Instagram Reels and coaching clips, organized by topic
- Exclusive app-only video content (Keith can record short coaching videos)
- Guided exercises (e.g., "The Provocateur Mirror Exercise")

#### 5.4.4 Resource Library
- Frameworks as visual one-pagers (5 Dials, Three Lies, Mommy Matrix, ROI of Intimacy)
- "Scripts" — suggested language for difficult conversations
- Recommended reading list and external resources

### 5.5 Brotherhood Community (Premium)

#### 5.5.1 Anonymous Feed
- Men can post wins, struggles, and questions anonymously or with display name
- AI-moderated for safety and quality
- Upvote system for most helpful posts
- Keith or his team can pin/highlight posts

#### 5.5.2 Accountability Partners
- Optional pairing system — matched by marriage stage and goals
- In-app messaging between accountability partners
- Shared commitment tracking

#### 5.5.3 Live Elements (Premium)
- Monthly live Q&A with Keith (audio or video, in-app)
- Weekly group coaching calls with Keith's certified coaches
- Access to Ascend Brotherhood event announcements and registration

### 5.6 Progress & Insights

#### 5.6.1 Marriage Health Score
- Composite score derived from: 5 Dials ratings, engagement consistency, AI conversation sentiment analysis, self-reported relationship milestones
- Weekly/monthly trend visualization
- "State of Your Marriage" monthly AI-generated report

#### 5.6.2 Milestone System
- Achievement badges tied to real behavioral change:
  - "First 5 Dials Assessment"
  - "7-Day Streak"
  - "30 Days Intentional"
  - "Had the Hard Conversation"
  - "Planned a Real Date"
  - "She Initiated" (user-reported milestone)
  - "Brotherhood Contributor"

#### 5.6.3 Journey Map
- Visual timeline of user's marriage transformation journey
- Key moments, breakthroughs, setbacks plotted over time
- Exportable for use in coaching sessions

---

## 6. Technical Architecture

### 6.1 Platform
- **iOS:** Swift/SwiftUI, minimum iOS 16
- **Android:** Kotlin/Jetpack Compose, minimum Android 10
- **Cross-Platform Option:** React Native or Flutter for faster V1 launch
- **Backend:** Node.js/TypeScript on AWS or GCP
- **Database:** PostgreSQL (user data, profiles) + Redis (sessions, cache)
- **AI:** Claude API (Anthropic) for conversational AI engine
- **Vector Store:** Pinecone or pgvector for RAG over Keith's content corpus

### 6.2 AI Architecture
```
┌─────────────────────────────────────────────┐
│              Coach Keith AI Engine           │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐    ┌──────────────────┐    │
│  │ System      │    │ RAG Pipeline     │    │
│  │ Prompt      │    │                  │    │
│  │ (Keith's    │    │ - Book chapters  │    │
│  │  voice,     │    │ - Podcast xcrpts │    │
│  │  frameworks,│    │ - Instagram posts│    │
│  │  rules)     │    │ - Coaching notes │    │
│  └──────┬──────┘    │ - Framework docs │    │
│         │           └────────┬─────────┘    │
│         │                    │              │
│         ▼                    ▼              │
│  ┌──────────────────────────────────────┐   │
│  │         Claude API (Anthropic)       │   │
│  │   + User Profile Context            │   │
│  │   + Conversation History            │   │
│  │   + Current 5 Dials State           │   │
│  │   + Marriage Stage Classification   │   │
│  └──────────────────────────────────────┘   │
│                    │                        │
│                    ▼                        │
│  ┌──────────────────────────────────────┐   │
│  │    Response + Suggested Actions      │   │
│  │    + Dial Adjustments               │   │
│  │    + Content Recommendations        │   │
│  │    + Accountability Prompts         │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 6.3 Content Ingestion Pipeline — Complete Specification

The AI knowledge base is only as good as the content it's trained on. This section details the **complete, automated pipeline** for ingesting every piece of Keith Yackey's content into a searchable, embeddable RAG corpus.

#### 6.3.1 Podcast Transcription Pipeline (88 Episodes, ~65 Hours)

**Source Inventory:**
Keith's podcast exists across two hosting platforms due to a migration in mid-2025:

| Feed | URL | Episodes | Date Range |
|------|-----|----------|------------|
| Libsyn (legacy) | `https://rss.libsyn.com/shows/250229/destinations/1885151.xml` | 63 | 2024 – May 2025 |
| Spotify for Creators | `https://anchor.fm/s/103991930/podcast/rss` | 25 | Dec 2025 – Present |
| **Total** | | **88** | **2024 – Present** |

**Average episode length:** ~42 minutes
**Estimated total audio:** ~65 hours
**Audio formats:** MP3 and MP4 (Libsyn), MP3 (Spotify)

**Guest Podcast Appearances (8 additional episodes to transcribe):**

| Show | Episode Title | Estimated Length |
|------|--------------|-----------------|
| Order of Man | "The 5 Dials to a Powerful Marriage" | 60 min |
| The Dad Edge | "Keith Yackey - The Married Game" | 55 min |
| Lori Harder | "How to Attract What You Want" | 45 min |
| ManTalks | "The Recipe for Attraction in Long-Term Relationships" | 50 min |
| The World Needs Men | "Playing the Married Game" | 50 min |
| ConsistencyWins | "From Neglect to Connection" | 45 min |
| The Bucket List Life | "The 5 Desire Dials for an Insatiable Marriage" | 45 min |
| Ben Reinberg I OWN IT | "Ascend Your Attraction Game" | 40 min |

**Total guest appearance audio:** ~6.5 hours
**Grand total audio to transcribe:** ~71.5 hours

**Transcription Service Selection:**

| Service | Cost/Hour (w/ diarization) | Total Est. Cost | Accuracy | Speaker ID | Recommendation |
|---------|---------------------------|-----------------|----------|------------|----------------|
| AssemblyAI | $0.17/hr | **$12.16** | 95%+ | Yes (add-on $0.02/hr) | **Primary — Best value** |
| OpenAI Whisper (GPT-4o Transcribe) | $0.36/hr | $25.74 | 97%+ | Yes (included) | Backup — Higher accuracy |
| Deepgram Nova-3 | $0.57/hr | $40.76 | 94%+ | Yes (add-on $0.12/hr) | Not recommended |

**Recommended approach:** AssemblyAI for bulk transcription ($12.16 total), with OpenAI Whisper as a second-pass for the 20 most important episodes where accuracy is critical.

**Automated Transcription Pipeline:**

```
┌──────────────────────────────────────────────────────────────┐
│                 PODCAST TRANSCRIPTION PIPELINE                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: RSS Feed Parser                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Parse both RSS feeds (Libsyn + Spotify/Anchor)      │  │
│  │ • Extract: title, date, duration, audio URL, desc     │  │
│  │ • Deduplicate episodes that appear in both feeds      │  │
│  │ • Output: episode_manifest.json (88+ entries)         │  │
│  └────────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  Step 2: Audio Downloader                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Download all audio files from Libsyn CDN + Spotify  │  │
│  │ • Convert MP4 → MP3 where needed (ffmpeg)             │  │
│  │ • Normalize audio levels (-16 LUFS target)            │  │
│  │ • Store in: /raw_audio/{episode_id}.mp3               │  │
│  │ • Estimated storage: ~8 GB                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  Step 3: Transcription (AssemblyAI API)                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Upload audio → AssemblyAI                           │  │
│  │ • Enable: speaker_diarization, auto_chapters,         │  │
│  │   entity_detection, sentiment_analysis                │  │
│  │ • Batch process: 10 concurrent jobs                   │  │
│  │ • Output per episode:                                 │  │
│  │   - Full transcript (timestamped, speaker-labeled)    │  │
│  │   - Auto-generated chapters/topics                    │  │
│  │   - Sentiment analysis per segment                    │  │
│  │   - Named entities (people, concepts, books)          │  │
│  │ • Store in: /transcripts/{episode_id}.json            │  │
│  │ • Estimated runtime: 2-3 hours (parallel processing)  │  │
│  │ • Estimated cost: $12.16                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  Step 4: Transcript Post-Processing                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Speaker label mapping (Speaker A → "Keith",         │  │
│  │   Speaker B → "Jesse" / "Garrett" / "Guest")          │  │
│  │ • Fix common ASR errors (proper nouns: "Married Game",│  │
│  │   "Ascend Brotherhood", "Five Dials", "Provocateur",  │  │
│  │   "Mommy Matrix", "Jesse Joy", "Garrett White")       │  │
│  │ • Segment into topical chunks (by auto-chapter)       │  │
│  │ • Tag each chunk with: episode, timestamp, speaker,   │  │
│  │   topic, dial relevance (1-5), sentiment              │  │
│  │ • Generate per-episode summary (Claude API)           │  │
│  │ • Store in: /processed/{episode_id}_chunks.json       │  │
│  └────────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  Step 5: Embedding & Indexing                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Chunk strategy: Semantic chunking at 400-512 tokens │  │
│  │   with 15% overlap (2026 RAG best practice)           │  │
│  │ • Embed each chunk using text-embedding-3-large       │  │
│  │   (OpenAI) or Voyage-3 (Anthropic partner)            │  │
│  │ • Store in pgvector or Pinecone with metadata:        │  │
│  │   {episode_id, timestamp, speaker, topic, dial,       │  │
│  │    sentiment, date, chunk_text}                       │  │
│  │ • Build topic index for content recommendation engine │  │
│  │ • Estimated vectors: ~15,000-20,000 chunks            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Step 6: Ongoing Ingestion (Automated)                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Cron job: Check RSS feed daily for new episodes     │  │
│  │ • Auto-download → transcribe → process → embed        │  │
│  │ • New episodes available in AI within 4 hours of pub  │  │
│  │ • Alert Keith's team when new episode is indexed      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Implementation Script (Node.js/TypeScript):**
The pipeline will be built as a standalone CLI tool in this repo at `/tools/content-pipeline/` with the following commands:
- `npx pipeline catalog` — Parse RSS feeds and build episode manifest
- `npx pipeline download` — Download all audio files
- `npx pipeline transcribe` — Batch transcribe via AssemblyAI
- `npx pipeline process` — Post-process and chunk transcripts
- `npx pipeline embed` — Generate embeddings and index
- `npx pipeline sync` — Run full pipeline for new episodes only
- `npx pipeline status` — Show ingestion progress and stats

#### 6.3.2 Book Ingestion Pipeline ("The Married Game")

**Source Material:**
- **Title:** The Married Game: The Secret Playbook to Primal Sex and Unlimited Pleasure Inside Your Marriage
- **Authors:** Keith Yackey, Garrett White (foreword)
- **Kindle ASIN:** B0DWKSCSLK
- **Paperback ISBNs:** 9798992486308, 9798992486315
- **Audible ASIN:** B0FNFG71XW
- **Available Formats:** Kindle (MOBI/KFX), Paperback, Audible

**Ingestion Approach:**

```
┌──────────────────────────────────────────────────────────┐
│              EBOOK INGESTION PIPELINE                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Option A: EPUB/PDF Source (Preferred)                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │ • Obtain EPUB or PDF directly from Keith/publisher │  │
│  │ • Parse using Unstructured.io library              │  │
│  │   (supports .epub, .pdf, .docx natively)           │  │
│  │ • Extract: chapters, headings, paragraphs,         │  │
│  │   pull quotes, lists, bold/italic emphasis          │  │
│  │ • Preserve chapter structure and hierarchy          │  │
│  └────────────────────────────────────────────────────┘  │
│                         │                                │
│  Option B: Kindle Source (Fallback)                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │ • Export Kindle highlights/notes via Readwise API  │  │
│  │ • OR use Calibre to convert KFX → EPUB → text     │  │
│  │ • OR manually extract from Kindle Cloud Reader     │  │
│  └────────────────────────────────────────────────────┘  │
│                         │                                │
│  Option C: Audible Transcript (Supplemental)             │
│  ┌────────────────────────────────────────────────────┐  │
│  │ • Download Audible audiobook (Keith narrates)      │  │
│  │ • Transcribe via Whisper (highest accuracy mode)   │  │
│  │ • Cross-reference with text source for corrections │  │
│  │ • Captures Keith's vocal emphasis & delivery       │  │
│  └────────────────────────────────────────────────────┘  │
│                         │                                │
│                         ▼                                │
│  Processing Pipeline                                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 1. STRUCTURAL PARSING                              │  │
│  │    • Identify: chapters, sections, frameworks,     │  │
│  │      stories, exercises, key principles            │  │
│  │    • Map each section to relevant Dial (1-5)       │  │
│  │    • Tag: concept_type (framework, story, exercise,│  │
│  │      principle, analogy, actionable_advice)        │  │
│  │                                                    │  │
│  │ 2. SEMANTIC CHUNKING                               │  │
│  │    • Chunk by concept, not by token count          │  │
│  │    • Each chunk = one complete idea/story/framework│  │
│  │    • Target: 300-600 tokens per chunk              │  │
│  │    • Overlap: Include chapter context in metadata  │  │
│  │    • Special handling for:                         │  │
│  │      - Multi-paragraph stories (keep together)     │  │
│  │      - Framework definitions (keep complete)       │  │
│  │      - Actionable exercises (keep with context)    │  │
│  │                                                    │  │
│  │ 3. ENRICHMENT (Claude API)                         │  │
│  │    • For each chunk, generate:                     │  │
│  │      - 3-5 questions this chunk answers            │  │
│  │      - Keywords and concepts referenced            │  │
│  │      - Which user persona benefits most            │  │
│  │      - Related chunks (cross-references)           │  │
│  │      - "When to surface" triggers                  │  │
│  │                                                    │  │
│  │ 4. EMBEDDING & INDEXING                            │  │
│  │    • Same vector store as podcast content           │  │
│  │    • Metadata: {chapter, section, concept_type,    │  │
│  │      dial, questions_answered, keywords}           │  │
│  │    • Estimated: 200-400 chunks from full book      │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Action Required from Keith's Team:**
- [ ] Provide the book manuscript in EPUB, PDF, or DOCX format
- [ ] Confirm rights clearance for AI training use
- [ ] Identify any sections that should NOT be in the AI (e.g., personal details about clients)

#### 6.3.3 Instagram Content Ingestion

**Source:** @keithyackey (14K followers)
**Content Types:** Reels (video), carousel posts, stories highlights

```
Pipeline:
1. Export all posts via Instagram Graph API (requires Keith's auth)
   - OR use Apify/PhantomBuster scraper for public content
2. For Reels (video):
   - Download video files
   - Transcribe audio via Whisper (short-form, high accuracy)
   - Extract: spoken content, captions, hashtags
3. For Image/Carousel posts:
   - Extract: caption text, hashtags, engagement metrics
4. For all content:
   - Tag by topic, dial relevance, date
   - Chunk and embed into same vector store
   - Estimated: 200-500 posts, ~300-800 content chunks
```

#### 6.3.4 Coaching Frameworks (Manual Curation)

Keith or his team creates structured documents for each core framework:

| Framework | Document | Priority |
|-----------|----------|----------|
| The Five Dials | Complete guide with scoring rubrics, examples, common patterns per dial | P0 |
| The Provocateur Identity | Definition, characteristics, anti-patterns, transformation path | P0 |
| Three Lies Men Believe | Each lie explained, how to identify, how to overcome | P0 |
| The Mommy Matrix | What it is, signs you're in it, how to escape | P0 |
| ROI of Intimacy | Investment/return framework, measurement, examples | P1 |
| Crisis Stabilization | Step-by-step for men whose wives are leaving | P1 |
| The Follow-Through Protocol | Building trust through consistency | P1 |
| Competition/Comparison/Shame | Reframing these as growth tools | P2 |
| 75 Hard for Marriage | Keith's adaptation of the discipline challenge | P2 |

**Format:** Markdown documents with structured headers, stored in `/content/frameworks/`

#### 6.3.5 GPT Reverse-Engineering

Extract knowledge from the existing Coach Keith GPT:
1. Run 50+ diverse conversations with the GPT covering every topic
2. Document: response patterns, frameworks referenced, advice given, tone, boundaries
3. Extract the effective "system prompt" behavior
4. Identify gaps where the GPT falls short (these become app advantages)
5. Port all extracted knowledge into the RAG corpus
6. **Improve on it** — add context, depth, and personalization the GPT can't do

#### 6.3.6 Live Coaching Session Transcripts

With client consent:
1. Record and transcribe Keith's 1-on-1 and group coaching calls
2. Anonymize all client details (names, locations, specifics)
3. Extract: coaching patterns, common scenarios, Keith's response frameworks
4. Tag by topic, dial, client archetype
5. This is the **highest-value content** — real coaching in action
6. Target: 20+ hours of coaching transcripts for V1

#### 6.3.7 Keith's Direct Recording Sessions

Purpose-built content for the AI:
1. Schedule 10 x 2-hour recording sessions with Keith
2. Format: Interviewer asks Keith common client questions
3. Keith responds naturally in his coaching voice
4. Covers edge cases the podcast doesn't address
5. Transcribe and add to corpus
6. This ensures the AI has Keith's take on every common scenario

#### 6.3.8 Complete Content Corpus Summary

| Source | Items | Est. Chunks | Status |
|--------|-------|-------------|--------|
| Podcast (Married Game) | 88 episodes (~65 hrs) | 8,000-12,000 | Automated pipeline ready |
| Podcast (Guest appearances) | 8 episodes (~6.5 hrs) | 800-1,200 | Manual download + pipeline |
| Book (The Married Game) | 1 book | 200-400 | Awaiting manuscript from Keith |
| Instagram | 200-500 posts | 300-800 | API access needed |
| Coaching Frameworks | 9 documents | 50-100 | Manual creation by Keith's team |
| GPT Reverse-Engineering | 50+ conversations | 200-400 | Research task |
| Live Coaching Sessions | 20+ hours | 2,000-3,000 | Requires client consent |
| Keith Recording Sessions | 20 hours | 2,000-3,000 | Requires scheduling |
| **TOTAL** | | **13,550-20,900 chunks** | |

**Estimated Vector Store Size:** ~20,000 embedded chunks
**Estimated Embedding Cost:** ~$4-8 (using text-embedding-3-small at $0.02/1M tokens)
**Estimated Total Ingestion Cost:** ~$50-75 (transcription + embedding + Claude enrichment)

#### 6.3.9 Content Quality Assurance

Before any content goes live in the AI:
1. **Keith Review:** Keith listens to 10 AI responses per week and grades them (sounds like me / doesn't sound like me)
2. **Framework Accuracy:** All framework explanations validated against Keith's source material
3. **Tone Calibration:** A/B test AI responses against actual Keith coaching clips
4. **Harmful Content Filter:** Ensure no advice that could be construed as manipulative, abusive, or that contradicts professional therapy
5. **Ongoing Feedback Loop:** Users can flag "that doesn't sound like Keith" — feeds back into prompt refinement

### 6.4 Data Privacy & Safety
- All user data encrypted at rest (AES-256) and in transit (TLS 1.3)
- No marriage data shared with third parties — ever
- Anonymous mode available for community features
- Crisis detection: AI monitors for mentions of self-harm, domestic violence, or abuse and provides appropriate resources/hotline numbers
- HIPAA-adjacent practices (not technically required but builds trust)
- User can export or delete all their data at any time

---

## 7. Monetization Strategy

### 7.1 Subscription Tiers

| Feature | Free Trial (7 days) | Standard ($29.99/mo) | Premium ($79.99/mo) |
|---------|---------------------|----------------------|---------------------|
| AI Coach conversations | 3/day | Unlimited | Unlimited |
| 5 Dials Dashboard | Basic | Full + history | Full + AI insights |
| Daily prompts | ✅ | ✅ | ✅ |
| Podcast library | 5 episodes | Full archive | Full + transcripts |
| Book access | Preview | — | Full digital book |
| Brotherhood community | — | Read-only | Full access + posting |
| Accountability partner | — | — | ✅ |
| Monthly live Q&A w/ Keith | — | — | ✅ |
| Weekly group coaching | — | — | ✅ |
| Priority AI (faster, deeper) | — | — | ✅ |
| Marriage Health Report | — | Monthly | Weekly |

### 7.2 Revenue Projections (Conservative)
- **Year 1 Target:** 5,000 paying subscribers (mix of Standard/Premium)
- **Blended ARPU:** ~$45/mo
- **Year 1 ARR:** ~$2.7M
- **Upsell Path:** Premium → Ascend Brotherhood ($5K-$15K live experience)

### 7.3 Additional Revenue
- **Ascend Brotherhood Upsell:** In-app promotion to Keith's premium live coaching community
- **Partner Products:** Curated affiliate offers (books, courses, experiences)
- **Corporate/Church Licenses:** Bulk subscriptions for men's groups

---

## 8. Go-to-Market Strategy

### 8.1 Launch Channels
1. **Married Game Podcast** — Keith announces to existing audience (primary channel)
2. **Instagram (@keithyackey, 14K followers)** — Reels showing app in action
3. **Existing Client Base** — Beta testers and early adopters from coaching programs
4. **Guest Podcast Circuit** — Keith's proven network (Order of Man, Dad Edge, Lori Harder, ManTalks, etc.)
5. **Ascend Brotherhood** — Premium members become evangelists

### 8.2 Content Marketing
- "5 Dials Challenge" — Free 5-day email/app challenge driving downloads
- Viral Reels: "I asked an AI trained on a marriage coach what to do about [common problem]"
- Testimonial videos from beta users
- Keith vs. AI side-by-side coaching clips

### 8.3 Strategic Partnerships
- **Men's communities:** Order of Man, The Dad Edge, ManTalks, Warrior
- **Churches & faith-based orgs:** Men's ministry programs
- **Therapists & counselors:** Referral partnerships (app as supplement to therapy)

---

## 9. Success Metrics (KPIs)

| Metric | Target (6 months post-launch) |
|--------|-------------------------------|
| Monthly Active Users (MAU) | 15,000 |
| Paid Subscribers | 5,000 |
| Daily Active / Monthly Active (DAU/MAU) | 35%+ |
| Average Session Length | 8+ minutes |
| 7-Day Retention | 55% |
| 30-Day Retention | 35% |
| Net Promoter Score (NPS) | 60+ |
| AI Conversations/User/Week | 4+ |
| 5 Dials Completion Rate (weekly) | 50% of active users |
| Churn Rate (monthly) | <8% |
| User-Reported "Marriage Improved" | 70% at 90 days |

---

## 10. Development Phases

### Phase 1: MVP (Months 1-3)
- Core AI coach with Keith's voice and frameworks
- Onboarding assessment and user profile
- 5 Dials self-assessment (basic)
- Daily push notification prompts
- 10 podcast episodes integrated
- Subscription billing (Standard tier only)
- iOS only

### Phase 2: Growth (Months 4-6)
- Android launch
- Full podcast library with search and transcripts
- 5 Dials dashboard with history and trends
- Evening reflection check-ins
- Streak tracking and milestones
- Book content integration
- Premium tier launch

### Phase 3: Community (Months 7-9)
- Brotherhood anonymous feed
- Accountability partner matching
- Live Q&A integration (audio rooms)
- Marriage Health Score and monthly reports
- Content recommendation engine refinement

### Phase 4: Scale (Months 10-12)
- Group coaching call integration
- Journey Map visualization
- Advanced AI personalization (learns user's communication style)
- Couples mode (optional — wife can participate)
- Church/organization bulk licensing
- Ascend Brotherhood upsell funnel

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI gives harmful advice | Guardrails in system prompt; crisis detection; disclaimers that app is not therapy |
| Users expect it to replace real coaching | Clear positioning as supplement; upsell path to live coaching |
| Keith's voice doesn't translate to AI | Extensive prompt engineering + RAG; Keith reviews and refines AI responses monthly |
| Low retention after novelty wears off | Daily engagement loops, accountability features, community, streak mechanics |
| Privacy concerns (sensitive marriage data) | Best-in-class encryption, no data sharing, easy deletion, transparent privacy policy |
| App store rejection (sensitive content) | Careful content moderation; frame as "personal development" not explicit content |
| Competitive entry (other coaches copy) | First-mover advantage + Keith's unique brand/voice is the moat |

---

## 12. Competitive Landscape

| Competitor | What They Do | Coach Keith AI Advantage |
|------------|-------------|--------------------------|
| BetterHelp/Talkspace | Online therapy (couples) | Not male-focused; no framework; expensive ($300+/mo) |
| Relish | Couples coaching app | Requires both partners; generic advice; no strong personality |
| Lasting | Marriage health app | Quiz-based, no AI coach; clinical feel vs. Keith's masculine energy |
| Mend | Breakup recovery | Post-relationship; not for saving marriages |
| Coach Keith GPT | Keith's current ChatGPT | No memory, no community, no accountability, no multimedia |
| Generic AI chatbots | ChatGPT, Claude, etc. | Not specialized; no Keith's IP; no frameworks; no progress tracking |

**Coach Keith AI's moat:** Keith Yackey's personal brand, proven frameworks, authentic voice, and the combination of AI + community + accountability in a single purpose-built app for married men.

---

## 13. Content Production & Ingestion Requirements

### Pre-Launch Content Ingestion (Automated — See Section 6.3)

| Task | Method | Est. Cost | Timeline | Owner |
|------|--------|-----------|----------|-------|
| Transcribe 88 podcast episodes (~65 hrs) | AssemblyAI batch API (automated pipeline) | $12.16 | 1 day (automated) | Engineering |
| Transcribe 8 guest appearances (~6.5 hrs) | Manual download + AssemblyAI | $1.11 | 1 day | Engineering |
| Post-process all transcripts (speaker labels, chunking, tagging) | Automated pipeline + Claude API | ~$5 | 1 day | Engineering |
| Embed ~15,000 transcript chunks into vector store | text-embedding-3-large | ~$4 | 2 hours | Engineering |
| Ingest "The Married Game" ebook | Unstructured.io parser + semantic chunking | ~$2 | 1 day | Engineering |
| Ingest Instagram content (200-500 posts) | Graph API scrape + Whisper for Reels | ~$5 | 1 day | Engineering |
| Reverse-engineer Coach Keith GPT | 50+ test conversations, pattern extraction | ~$10 | 2 days | AI Engineer |
| **Total automated ingestion** | | **~$39** | **~1 week** | |

### Pre-Launch Content Creation (Requires Keith)

| Task | Method | Timeline | Owner |
|------|--------|----------|-------|
| Record 10 x 2-hr direct Q&A sessions | Interview format, covers common scenarios | 4 weeks | Keith + Interviewer |
| Document 9 core frameworks in structured format | Keith reviews/approves written docs | 2 weeks | Content Producer + Keith |
| Write 90 daily prompt messages in Keith's voice | Keith writes or approves | 2 weeks | Content Producer + Keith |
| Create onboarding assessment question bank (30 questions) | Based on Keith's intake process | 1 week | Keith + Product |
| Record 10 exclusive video coaching clips for app | Short-form (2-5 min each) | 1 week | Keith |
| Provide book manuscript (EPUB/PDF/DOCX) | From Keith's files or publisher | 1 day | Keith |
| Provide 20+ hrs of coaching session recordings (anonymized) | With client consent | Ongoing | Keith |
| Review and approve AI voice calibration (10 responses/week) | Keith grades: "sounds like me" vs not | Ongoing | Keith |

### Ongoing Content Production (Monthly)

| Task | Method | Cost | Owner |
|------|--------|------|-------|
| New podcast episodes auto-ingested (4/mo) | Automated pipeline watches RSS feed | ~$0.50/mo | Automated |
| New Instagram content auto-ingested | Automated scraper + transcription | ~$0.25/mo | Automated |
| 1 live Q&A session for Premium subscribers | In-app audio room | — | Keith |
| 4 group coaching calls for Premium | In-app or Zoom integration | — | Keith's coaches |
| Review and refine AI responses based on user feedback | Prompt engineering updates | — | AI Engineer |
| 30 new daily prompt messages | Keith writes or approves | — | Content Producer |
| Monthly AI quality audit (listen to 40 AI responses) | Keith grades for voice accuracy | — | Keith |

### Content Ingestion Budget Summary

| Category | One-Time Cost | Monthly Ongoing |
|----------|--------------|-----------------|
| Transcription (AssemblyAI) | $13.27 | ~$0.75 |
| Embedding (OpenAI) | $4.00 | ~$0.50 |
| Claude API (enrichment, summaries) | $10.00 | ~$2.00 |
| Instagram scraping tool | $0 (API) or $49 (Apify) | $0-$49 |
| Keith's recording sessions | $0 (Keith's time) | $0 |
| **Total** | **~$27-$76** | **~$3-$52** |

The entire knowledge base can be built for under $100. The ongoing cost to keep it current is negligible.

---

## 14. Team Requirements

| Role | Responsibility | Hire or Contract |
|------|---------------|------------------|
| Product Manager | Own roadmap, features, user feedback | Hire |
| iOS Developer | Build and maintain iOS app | Contract (Phase 1), Hire (Phase 2+) |
| Android Developer | Build and maintain Android app | Contract (Phase 2+) |
| Backend Engineer | API, database, AI pipeline, infrastructure | Hire |
| AI/ML Engineer | Prompt engineering, RAG pipeline, fine-tuning | Contract → Hire |
| Designer (UI/UX) | App design, brand consistency | Contract |
| Community Manager | Moderate Brotherhood feed, support users | Hire (Phase 3) |
| Content Producer | Manage Keith's content pipeline for the app | Part-time hire |
| Keith Yackey | Creative direction, voice, content, live sessions | Founder/Advisor |

---

## 15. Appendix

### A. Keith Yackey Background
- Former pastor, turned real estate investor (flipped 200+ properties, built 8-figure firm), turned stand-up comedian, turned marriage coach
- Almost lost his marriage twice — wife told him "My life would be better without you"
- Completed 75 Hard and credits it as a life transformation
- Co-hosts Married Game Podcast with Jesse Joy and Garrett J. White
- Authored "The Married Game" with Garrett White
- Founded The Ascend Brotherhood (premium in-person men's community)
- Self-describes as "The World's Most Expensive Relationship Coach"
- Instagram: @keithyackey (14K followers)

### B. Complete Podcast Episode Catalog (88 Episodes — ALL to be transcribed)

**Feed 1: Spotify/Anchor (25 episodes, Dec 2025 – Mar 2026)**

| # | Title | Date |
|---|-------|------|
| 1 | Why Your Marriage Feels Off (And How to Fix It FAST) | Mar 20, 2026 |
| 2 | Q&A: Can a Marriage Survive If Only One Person Is Trying? | Mar 17, 2026 |
| 3 | Powerful Women & Scared Men: The Truth About Modern Dating | Mar 6, 2026 |
| 4 | Why Does Logic Fail In Most Marriages? | Feb 23, 2026 |
| 5 | Boring Men Get Friend-Zoned in Their Own Marriage | Feb 20, 2026 |
| 6 | Why Valentine's Day Fails Most Marriages | Feb 12, 2026 |
| 7 | Why Even Successful Men Still Feel Rejected | Feb 6, 2026 |
| 8 | What a Blue Belt Taught Me About Leading My Marriage | Jan 30, 2026 |
| 9 | Grief, Leadership, and Becoming the Man Your Marriage Needs | Jan 23, 2026 |
| 10 | When Your Wife Pulls Away: The Questions Men Are Afraid to Ask | Jan 21, 2026 |
| 11 | The $30,000 Conversation That Changed Everything | Jan 16, 2026 |
| 12 | Your Marriage Isn't Broken — You're Lying to Yourself | Jan 9, 2026 |
| 13 | The Barista Test: The Brutal Truth About Attraction in Marriage | Jan 7, 2026 |
| 14 | I'm Not Mad… I'm Just Disappointed | Jan 3, 2026 |
| 15 | The Hard Truth About Desire & Respect | Jan 1, 2026 |
| 16 | Here's Why She Doesn't See You As A Leader... | Dec 29, 2025 |
| 17 | She Cheated… But It Wasn't What You Think | Dec 24, 2025 |
| 18 | The Difference Between Being Married… and Being Desired | Dec 22, 2025 |
| 19 | The Lie Men Tell Themselves Right Before She Leaves | Dec 19, 2025 |
| 20 | Why Are You Leading Everyone Except Your Home? | Dec 18, 2025 |
| 21 | Comparison Isn't the Problem — Your Standards Are | Dec 15, 2025 |
| 22 | This Is Why Holidays Feel So Heavy in Marriage | Dec 12, 2025 |
| 23-25 | (3 additional episodes, titles in RSS feed) | Dec 2025 |

**Feed 2: Libsyn (63 episodes, 2024 – May 2025)**

| # | Title | Date |
|---|-------|------|
| 1 | Red Flag, Green Light | Jun 8, 2025 |
| 2 | He Said, She Said | May 23, 2025 |
| 3 | Sobriety and Strength: Justin Wenzel | May 16, 2025 |
| 4 | Your Turn To Finish | May 13, 2025 |
| 5 | Warrior Wisdom with Greg Anderson | May 6, 2025 |
| 6 | Confession Chair Chronicles | Apr 11, 2025 |
| 7 | First, I need to brush my teeth | Apr 4, 2025 |
| 8 | Love It, or Leave It | Mar 27, 2025 |
| 9 | No Plan, Just Mexico Madness | Mar 23, 2025 |
| 10 | Sixty Eight & I'll Owe You One | Mar 14, 2025 |
| 11 | Does My Relationship Advice Actually Work on My Wife? | Mar 10, 2025 |
| 12 | Miles Apart, Still Connected | Mar 4, 2025 |
| 13 | The Married Game Book Is Here | Feb 14, 2025 |
| 14 | The Man's Solution To A Nagging Wife | Jan 31, 2025 |
| 15 | The Key to fix a woman's nagging | Jan 24, 2025 |
| 16 | I Created All Our Problems | Jan 17, 2025 |
| 17 | Creating Financial Freedom | Jan 14, 2025 |
| 18 | False Entitlement | Jan 10, 2025 |
| 19 | Quit Making Your Wife The Boss | Dec 27, 2024 |
| 20 | Speaking the Language of Women | Dec 20, 2024 |
| 21 | Inside Jokes | Dec 13, 2024 |
| 22 | Love and Logistics | Nov 29, 2024 |
| 23 | Get Laid With Card Games | Nov 22, 2024 |
| 24 | Having All The Answers | Nov 19, 2024 |
| 25 | Past the Surface Level Conversations | Nov 15, 2024 |
| 26 | Insights Into Marriage | Nov 8, 2024 |
| 27 | Questions To Reveal Truths | Nov 1, 2024 |
| 28 | Keeping the Hope Alive | Oct 25, 2024 |
| 29 | A new potential with growth | Oct 18, 2024 |
| 30 | Life and Jiu Jitsu | Oct 8, 2024 |
| 31 | Just because she's wrong doesn't mean I'm right | Oct 4, 2024 |
| 32 | Taking Things To The Next Level | Oct 1, 2024 |
| 33 | Quality of Life | Sep 27, 2024 |
| 34 | Spectacular Words of Wisdom | Sep 24, 2024 |
| 35 | Abundance and Scarcity | Sep 20, 2024 |
| 36 | When Your Partner Steps Up | Sep 13, 2024 |
| 37 | Escaping the Mom Matrix | Sep 6, 2024 |
| 38 | Life, Marriage, and the Game of Money | Sep 4, 2024 |
| 39 | What You Really Want | Aug 30, 2024 |
| 40 | Understanding The Game | Aug 23, 2024 |
| 41 | The Partner Dial within your Marriage | Aug 16, 2024 |
| 42 | What to Accept In Your Relationship | Aug 9, 2024 |
| 43 | Similar Yet Unique Approach | Jul 27, 2024 |
| 44 | Layers of Life | Jul 19, 2024 |
| 45 | The Good Dating Life | Jul 12, 2024 |
| 46 | Sharing Reveals All | Jul 5, 2024 |
| 47 | Continue To Learn From Each Other | Jun 28, 2024 |
| 48 | The Importance of Words | Jun 21, 2024 |
| 49 | Managing Marital Expectations | Jun 19, 2024 |
| 50 | What Is Actually Attractive To A Male And A Female | Jun 17, 2024 |
| 51 | The Journey with Plant Medicine | Jun 11, 2024 |
| 52 | Improve Your Fighting Skills And Your Life | Jun 7, 2024 |
| 53 | From Fights To Forgiveness | Jun 5, 2024 |
| 54 | When Schoolmarm Meets Dad Mode | May 17, 2024 |
| 55 | Unleashing The Champion Within | May 8, 2024 |
| 56-63 | (8 additional episodes from early-mid 2024) | 2024 |

**Audio Source URLs:**
All Libsyn episodes available at: `https://traffic.libsyn.com/secure/rockstarrelationship/{filename}?dest-id=1885151`
Spotify/Anchor episodes available via RSS: `https://anchor.fm/s/103991930/podcast/rss`

**RSS Feed URLs for Automated Pipeline:**
- Libsyn: `https://rss.libsyn.com/shows/250229/destinations/1885151.xml`
- Spotify: `https://anchor.fm/s/103991930/podcast/rss`

### C. Guest Podcast Appearances (for additional AI training)
- Order of Man: "The 5 Dials to a Powerful Marriage"
- The Dad Edge: "Keith Yackey - The Married Game"
- Lori Harder: "How to Attract What You Want"
- ManTalks: "The Recipe for Attraction in Long-Term Relationships"
- The World Needs Men: "Playing the Married Game"
- ConsistencyWins: "From Neglect to Connection"
- The Bucket List Life: "The 5 Desire Dials for an Insatiable Marriage"
- Ben Reinberg I OWN IT: "Ascend Your Attraction Game"

### D. Key URLs & Technical Identifiers

**Websites:**
- Main: https://www.keithyackey.com
- Married Game: https://www.marriedgame.com
- Ascend Brotherhood: https://www.keithyackey.com/ascend

**Podcast:**
- Apple Podcasts ID: 1504170972
- Spotify Show ID: 2V1rx8gdPJIhG75ozPWR44
- RSS Feed (Libsyn/legacy): `https://rss.libsyn.com/shows/250229/destinations/1885151.xml`
- RSS Feed (Spotify/current): `https://anchor.fm/s/103991930/podcast/rss`
- Podcast GUID: 38fbcf83-f5ef-5068-b6b3-2df965bfdceb

**Book:**
- Kindle ASIN: B0DWKSCSLK
- Paperback ISBN: 9798992486308 / 9798992486315
- Audible ASIN: B0FNFG71XW
- Amazon (Paperback): https://www.amazon.com/Married-Game-Playbook-Unlimited-Pleasure/dp/B0DWGF14FJ
- Amazon (Kindle): https://www.amazon.com/Married-Game-Playbook-Unlimited-Pleasure-ebook/dp/B0DWKSCSLK

**Social:**
- Instagram: https://www.instagram.com/keithyackey/ (@keithyackey, 14K followers)
- LinkedIn: https://www.linkedin.com/in/keith-yackey-13289915/

**AI:**
- Existing GPT: https://chatgpt.com/g/g-6979be84569c8191baf4d6081340c46e-coach-keith

---

*Document prepared by Dave Fox for Keith Yackey | March 2026*
*Research conducted via Ruflo orchestration swarm — 5 specialized agents across website, podcast, book, social media, and GPT analysis*
