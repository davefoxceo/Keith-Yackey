# ADR-023: Real-Time Communication for Live Events

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
Coach Keith's coaching model includes live audio events — group coaching calls, Q&A sessions, and "hot seat" accountability sessions where participants speak directly with Keith or designated community leaders. These events require real-time audio with support for multiple simultaneous speakers, audience participation (raise hand, react), and recording for later playback. We evaluated several options: Twilio Video/Audio (managed, per-minute pricing), Agora (managed, competitive pricing), 100ms (managed, developer-friendly), and LiveKit (open-source, self-hostable). This is a Phase 3 feature — it will not ship in V1 — but the architecture must be designed now to avoid costly rework later.

**Decision:**
We will use LiveKit (v1.6+), an open-source WebRTC-based platform, self-hosted on AWS ECS for live audio rooms. The architecture is prepared during V1 but not built out until Phase 3.

1. **LiveKit Server Deployment:** LiveKit server will run as an ECS Fargate service behind a Network Load Balancer. TURN/STUN relay handled by LiveKit's built-in TURN server with fallback to Cloudflare TURN. Auto-scaling based on active room count and participant metrics via CloudWatch custom metrics.

2. **Room Architecture:** Each live event maps to a LiveKit room. Room types include `group_coaching` (up to 50 active speakers), `qa_session` (1 host + rotating speakers from audience), and `hot_seat` (1 host + 1 participant + audience listeners). Participant roles are enforced via LiveKit's permission system: `publisher` (can speak), `subscriber` (listen-only), `moderator` (can mute, remove, grant publish rights).

3. **Recording and Playback:** LiveKit Egress service records audio to S3 in AAC format. A post-processing Lambda transcribes recordings via AWS Transcribe and generates show notes via Claude Sonnet. Recordings are available in the app's content library within 30 minutes of event end.

4. **Phase 3 Preparation in V1:** During V1, we will define the database schema for events (`live_events` table with scheduling, room_id, host_id, event_type, max_participants), build the event scheduling API, and implement push notification triggers for event reminders. The LiveKit integration itself (client SDK, server SDK, room management) is deferred.

5. **Client Integration (Phase 3):** React Native LiveKit SDK (`@livekit/react-native` v2.x) provides the client-side implementation. The SDK supports background audio on both iOS and Android, critical for users who want to listen while multitasking.

**Consequences:**

### Pros (+)
- No per-minute fees — self-hosted LiveKit costs only the underlying ECS compute (~70-80% cheaper than Twilio at scale)
- Full control over server configuration, scaling behavior, and data residency
- Open-source codebase allows debugging and customization of server behavior
- LiveKit's permission model maps cleanly to coaching event roles
- Recording pipeline produces both audio archives and AI-generated summaries

### Cons (-)
- Self-hosting means we own uptime, scaling, and TURN relay reliability
- LiveKit operational expertise required on the team (or contracted)
- ECS auto-scaling for WebRTC workloads is less battle-tested than managed alternatives
- Phase 3 timeline means the architecture design may need revision based on V1 learnings

### Tradeoffs
We chose cost control and infrastructure ownership over the managed reliability of services like Twilio or Agora. At projected scale (100+ events/month with 20-50 participants each), self-hosted LiveKit saves an estimated $2,000-5,000/month compared to per-minute managed pricing. The risk is operational complexity — WebRTC infrastructure requires expertise in NAT traversal, codec negotiation, and real-time scaling. We mitigate this by deferring the build to Phase 3, giving the team time to develop operational expertise and allowing LiveKit's ecosystem to mature further.
