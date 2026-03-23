# Coach Keith AI — Data Persistence Strategy Proposal

**Date:** March 23, 2026
**Author:** Development Team
**Status:** PROPOSAL — Awaiting Decision
**Audience:** Non-technical stakeholders

---

## The Problem

Right now, Coach Keith AI stores everything in memory. When the server restarts, all user accounts, conversations, and learning data disappear. Only Keith's coaching knowledge base (158 podcast/framework entries) survives because it's baked into the code.

We need a persistence strategy that:

1. **Saves everything locally** so data survives restarts (immediate need)
2. **Enables SONA self-learning** so the AI gets smarter from every conversation
3. **Deploys to Google Cloud** when ready for real users
4. **Keeps user conversations private** — never shared between users

---

## Three Options Evaluated

We reviewed the RuVector documentation (116 Architecture Decision Records) and evaluated three approaches. Here's the comparison in plain English.

---

### Option A: RVF Files (Local-First)

**What it is:** RVF (RuVector Format) is a smart file format — like a self-contained filing cabinet for AI knowledge. One `.rvf` file holds Keith's coaching content, the AI's understanding of it, search indexes, learning patterns, and tamper-proof signatures. It's a single file you can copy, back up, or move to any server.

**How it works:**
- Keith's knowledge base → saved as one `.rvf` file on your Mac
- Each user's conversations → saved as a separate user-scoped `.rvf` file
- Learning patterns (SONA) → stored inside the same files automatically
- Crash-safe: even if power cuts mid-write, the data is intact
- Cold start in under 5 milliseconds

**User isolation:** Each user gets their own file. Physically impossible for conversations to leak.

**Cloud path:** Copy the files to a Google Cloud Storage bucket. Same format works everywhere — Mac, server, even in a browser.

**Cost:** $0 — it's a file format, not a paid service. Storage costs are just disk space.

**Pros:**
- Zero ongoing cost
- Data lives on your machine — you own it completely
- Backup = copy one file
- Fastest option: 0.1ms search latency
- Built-in tamper protection (cryptographic signatures)
- Works offline

**Cons:**
- Requires the Ruvector Rust binary to be compiled for your platform
- Learning is per-instance (the coaching AI on your Mac doesn't learn from users on another machine)
- More setup work than a cloud database

---

### Option B: Pi-Brain / MCP-Brain (Cloud-Shared)

**What it is:** Pi-Brain is a cloud-hosted "shared intelligence" service that already runs at `pi.ruv.io` on Google Cloud. Think of it as a collective brain — every coaching session makes it smarter, and new users immediately benefit from what past users taught it. Claude can already talk to it through 22 built-in MCP tools.

**How it works:**
- Keith's knowledge base → uploaded to the shared brain via `brain_share`
- User conversations → stored in Google Firestore (Google's database)
- Learning patterns → federated MicroLoRA (tiny 2KB neural network updates shared across all sessions)
- Hot data cached in memory, warm data in Firestore, cold data in Google Cloud Storage
- Scale-to-zero: costs nothing when nobody is using it

**User isolation:** Data is tagged by contributor/namespace. Can be isolated but requires careful configuration since the brain is designed to share knowledge.

**Cloud path:** Already deployed. Just connect with `claude mcp add pi --url https://pi.ruv.io/sse`.

**Cost:** ~$100-200/month at production traffic. Scale-to-zero means near-$0 when idle.

**Pros:**
- Already deployed and running
- 22 MCP tools ready to use right now (search, share, vote, sync, transfer learning)
- AI gets smarter across ALL users (collective intelligence)
- New users benefit immediately from past sessions (no cold start problem)
- Auto-scales: handles 1 user or 10,000
- Seven layers of security including anti-poisoning and PII stripping

**Cons:**
- Google Cloud vendor lock-in (Firestore + GCS)
- Ongoing monthly cost (~$100-200)
- Data lives in Google's cloud, not on your machine
- Shared brain architecture means extra care needed for user privacy
- Single region (us-central1) — may be slow for international users

---

### Option C: Hybrid (Recommended)

**What it is:** Use RVF files locally for development and immediate persistence, with Pi-Brain as the cloud backend when you're ready to deploy. This gives you the best of both worlds.

**How it works:**

**Phase 1 — Now (Local persistence):**
- Replace the in-memory stores with RVF files on disk
- Keith's knowledge base → one shared `.rvf` file
- User conversations → individual user-scoped `.rvf` files
- Everything persists across restarts
- SONA learning starts accumulating locally
- Cost: $0

**Phase 2 — When ready for users (Cloud):**
- Deploy API to Google Cloud Run
- Connect Pi-Brain for shared coaching intelligence
- User data in Firestore (managed, scalable, secure)
- Keith's knowledge base synced to Pi-Brain for all instances
- SONA learning benefits all users collectively
- Cost: ~$100-200/month

**Phase 3 — Scale (Full architecture):**
- RVF files for edge/offline capability (PWA works without internet)
- Pi-Brain for cloud intelligence and cross-session learning
- PostgreSQL + Ruvector extension for relational data (users, subscriptions, billing)
- Federated learning: coaching patterns learned from thousands of users make Keith's AI genuinely world-class

**User isolation:**
- Phase 1: Physical file separation (each user = separate file)
- Phase 2: Firestore document-level security rules + Pi-Brain namespace isolation
- Phase 3: Row-level security in PostgreSQL + encrypted RVF containers

---

## Comparison Table

| | RVF Files | Pi-Brain Cloud | Hybrid (Recommended) |
|---|---|---|---|
| **Setup effort** | Medium | Low (already deployed) | Medium now, low later |
| **Monthly cost** | $0 | ~$100-200 | $0 now, ~$100-200 later |
| **Data ownership** | 100% yours | Google Cloud | Yours locally, cloud when deployed |
| **Survives restart** | Yes | Yes | Yes |
| **SONA learning** | Per-instance | Cross-user | Per-instance now, cross-user later |
| **User privacy** | Physical isolation | Namespace isolation | Both |
| **Cloud-ready** | Copy files | Already there | Gradual migration |
| **Offline support** | Full | None | Full locally, cloud when online |
| **Best for** | Development/demo | Production | Both |

---

## Recommendation

**Go with Option C (Hybrid)**. Here's why:

1. **Immediate need:** RVF files give you local persistence today at zero cost. No more losing data on restart.

2. **SONA path:** RVF natively stores SONA learning patterns. As users interact with Coach Keith, the AI accumulates coaching intelligence in the `.rvf` files. When you move to cloud, those patterns transfer to Pi-Brain.

3. **Demo to Keith:** For today and ongoing development, local RVF files are perfect. Data persists, the AI learns, and there's no cloud bill.

4. **Production deployment:** When ready for real users, Pi-Brain is already deployed at `pi.ruv.io`. The 22 MCP tools are already available. Migration is straightforward: export local RVF knowledge → import to Pi-Brain.

5. **No vendor lock-in trap:** RVF files are portable. If you ever want to leave Google Cloud, your data comes with you.

---

## Next Steps (When Approved)

1. Install Ruvector native binary for macOS (Apple Silicon)
2. Replace `InMemoryVectorStore` with RVF-backed storage
3. Add user data persistence (conversations, accounts) to local `.rvf` files
4. Enable SONA learning engine (currently stubbed out)
5. Test persistence across restarts
6. Document the cloud migration path for Phase 2

**Estimated effort:** 2-3 days for Phase 1 (local persistence)
**Estimated effort:** 1-2 weeks for Phase 2 (cloud deployment)

---

## Technical Reference

The following Ruvector ADRs informed this proposal:

- ADR-001: Core architecture (HNSW, GNN learning, multi-platform)
- ADR-006: Memory management (tiered hot/warm/cold, quantization)
- ADR-027: HNSW parameterized queries (search algorithm)
- ADR-029: RVF canonical format (file specification)
- ADR-030: RVF cognitive containers (self-contained AI files)
- ADR-033: Progressive indexing (fast cold starts)
- ADR-056: RVF knowledge export (data portability)
- ADR-059: Shared brain on Google Cloud
- ADR-060: Shared brain capabilities (22 MCP tools)
- ADR-064: Pi-Brain infrastructure (deployment architecture)
- ADR-066: SSE/MCP transport (how Claude talks to Pi-Brain)
- ADR-069: Google edge network deployment
- ADR-094: Shared web memory (browser persistence)
