# ADR-045: Voice Mode with Keith Voice Clone

**Status:** Proposed
**Date:** 2026-03-24

## Context

Keith Yackey currently coaches many of his clients via Voxer -- a walkie-talkie style voice messaging app. Clients send Keith voice messages describing their situations, and Keith responds with voice messages containing coaching advice. This is high-touch and unscalable: Keith personally records every response, often spending hours per day on Voxer.

The Coach Keith AI already replicates Keith's coaching style in text. The next step is replicating his voice. ElevenLabs offers professional voice cloning that can produce highly realistic speech from text, using as little as 30 minutes of clean reference audio. Combined with speech-to-text on the input side, the app can offer a full voice conversation experience that sounds like Keith.

This is not just a convenience feature -- it is a Voxer replacement. Keith's existing Voxer clients can be migrated to the app where they get the same voice experience but powered by AI, freeing Keith's time while maintaining the personal feel his clients expect.

## Decision

Build a **voice conversation mode** that uses ElevenLabs Voice Cloning for text-to-speech output and Whisper (or ElevenLabs Speech-to-Text) for input, creating a full voice-in/voice-out coaching experience.

### Voice Pipeline Architecture

```
User speaks into mic
       |
       v
Speech-to-Text (Whisper API or ElevenLabs STT)
       |
       v
Transcript text sent to Coach Keith AI (Claude + RAG, same as text chat)
       |
       v
AI generates text response (same pipeline as ADR-028)
       |
       v
Text-to-Speech (ElevenLabs with Keith's cloned voice)
       |
       v
Audio plays back to user through app
```

### Latency Budget (Target: Under 3 Seconds Total)

| Stage | Target Latency | Notes |
|-------|---------------|-------|
| Speech-to-text | 500ms | Whisper API processes in near-real-time |
| AI response generation | 1500ms | Claude with streaming, first sentence available early |
| Text-to-speech | 800ms | ElevenLabs streaming TTS, playback begins before full generation |
| Network overhead | 200ms | WebSocket connection, audio streaming |
| **Total** | **3000ms** | Start of speech playback from end of user speaking |

Streaming is critical: TTS begins on the first sentence of Claude's response while subsequent sentences are still generating. The user hears Keith start talking within 2 seconds.

### Voice Cloning Setup

Keith provides approximately 30 minutes of clean audio recordings:

- Studio-quality recording (no background noise, consistent mic distance)
- Variety of emotional tones: encouraging, challenging, serious, humorous
- Sample coaching conversations covering all Five Dials topics
- ElevenLabs Professional Voice Cloning tier required ($99/month plan minimum)
- Voice model stored in ElevenLabs account, accessed via API key

### Voxer Migration Strategy

For Keith's existing Voxer coaching clients:

1. **Phase 1 -- Parallel**: clients continue using Voxer, Keith responds manually, but also get invited to try voice mode in the app
2. **Phase 2 -- Redirect**: new Voxer messages from clients get an auto-reply: "Hey brother, I've moved my coaching to the app -- you'll get faster responses and it still sounds like me. [link]"
3. **Phase 3 -- Sunset**: Voxer used only for personal messages, all coaching goes through the app

Voxer API integration is not pursued because Voxer does not offer a public API for message interception or automated responses. The migration is a client communication effort, not a technical integration.

### Cost Analysis

| Metric | Estimate |
|--------|----------|
| ElevenLabs TTS cost | ~$0.30 per 1,000 characters |
| Average AI response length | 400-600 characters |
| Cost per voice response | $0.012 - $0.018 |
| Average voice sessions per user/month | 15-20 |
| Cost per user per month (voice only) | $0.18 - $0.36 |
| Whisper API cost per minute of audio | $0.006 |
| Average user speech input per session | 30-60 seconds |
| STT cost per user per month | $0.05 - $0.10 |
| **Total voice cost per user/month** | **$0.23 - $0.46** |

At the Premium+ tier price point ($49/month from ADR-034), voice mode cost is under 1% of revenue per user.

### Feature Gating

- Voice mode is a **Premium+ exclusive** feature (ADR-034 tier structure)
- Free and Standard tier users see a voice mode teaser with upgrade prompt
- Voice mode toggle in conversation UI: user can switch between text and voice mid-conversation
- Transcript of all voice conversations saved and visible in chat history

### Privacy and Data Handling

- User voice recordings are streamed to Whisper API for transcription and immediately discarded
- No raw audio is stored on Coach Keith servers
- Only the text transcript is persisted in the conversation history
- Keith's voice model is stored in ElevenLabs (third-party), not self-hosted
- Privacy policy must disclose: voice data processed by ElevenLabs and OpenAI (Whisper)
- Users must consent to voice processing on first use of voice mode

## Implementation

```
src/services/voice.service.ts          -- orchestrates the full voice pipeline
src/services/speech-to-text.service.ts -- Whisper API integration
src/services/text-to-speech.service.ts -- ElevenLabs TTS with Keith voice
src/components/voice-conversation.tsx  -- voice UI (record button, playback, waveform)
```

### VoiceService API

- `startVoiceSession(userId) -> VoiceSession` -- initializes WebSocket for streaming
- `processVoiceInput(audioBlob) -> string` -- sends to Whisper, returns transcript
- `generateVoiceResponse(text) -> AudioStream` -- sends to ElevenLabs, returns streaming audio
- `getVoiceTranscript(sessionId) -> Message[]` -- returns text transcript of voice conversation

## Consequences

### Positive

- Replaces Voxer and frees hours of Keith's daily time currently spent recording voice responses
- Voice mode feels more personal and intimate than text -- matches the brotherhood culture
- Leverages the same AI coaching pipeline (no separate logic), just different I/O modality
- Low marginal cost per user makes it profitable even at modest subscription prices
- Streaming architecture keeps latency within conversational norms

### Negative

- ElevenLabs dependency: voice quality and availability tied to a third-party service
- Voice cloning raises ethical considerations -- must be transparent that it is AI-generated Keith, not live Keith
- Voxer migration may cause friction with long-time clients who prefer the existing workflow
- Mobile browser audio APIs can be unreliable (especially Safari); may require native app wrapper

### Mitigations

- Voice mode UI clearly labels responses as "AI Coach Keith" to maintain transparency
- Fallback to text mode if ElevenLabs API is unavailable (graceful degradation)
- Keith personally introduces voice mode to his Voxer clients, framing it as an upgrade
- Test extensively on iOS Safari and Android Chrome; consider React Native wrapper if browser audio proves unreliable
- Monitor ElevenLabs uptime and maintain a secondary TTS provider evaluation (Amazon Polly, Google Cloud TTS) as backup
