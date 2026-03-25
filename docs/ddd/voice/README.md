# Voice Bounded Context

## Overview

The **Voice** context enables real-time voice conversations with Coach Keith using his cloned voice. It manages speech-to-text transcription, text-to-speech synthesis, and the voice session lifecycle. Voice is a new **channel** for the Coaching context -- the same AI coach, different I/O modality. It replaces Voxer for existing clients who prefer voice interaction.

**Upstream Dependencies:** Coaching (AI response generation, conversation persistence), Identity (user profile, voice preferences)
**Downstream Consumers:** Engagement (voice sessions count as engagement), Accountability (voice is a delivery channel for interventions)
**Integration:** ElevenLabs API for TTS (Keith's cloned voice), OpenAI Whisper for STT
**Referenced ADR:** 045 (voice mode architecture)

---

## Aggregates

### VoiceSession (Aggregate Root)

A real-time voice interaction session between a user and Coach Keith. Each voice session maps to a Coaching conversation -- voice messages are transcribed and fed into the same Coaching pipeline, and AI text responses are synthesized back to audio.

**Invariants:**
- A VoiceSession must reference a valid Coaching `conversationId`.
- Only one active VoiceSession per user at a time.
- Session must be explicitly started and ended -- no implicit timeouts shorter than 5 minutes of silence.
- Audio data is ephemeral -- transcripts are persisted, raw audio is discarded after processing.
- Total latency (STT + AI + TTS) must be tracked per message for performance monitoring.

---

## Entities

```typescript
interface VoiceMessage {
  readonly id: string;
  readonly sessionId: string;
  readonly audioIn: AudioPayload | null; // user's voice input
  readonly transcript: TranscriptionResult;
  readonly aiResponseText: string;
  readonly audioOut: AudioPayload; // Keith's voice output
  readonly latencyMs: {
    stt: number;     // speech-to-text
    ai: number;      // Claude API response
    tts: number;     // text-to-speech
    total: number;   // end-to-end
  };
  readonly createdAt: string;
}

interface VoiceProfile {
  readonly userId: string;
  readonly voiceId: string; // ElevenLabs voice clone ID for Keith
  readonly provider: 'elevenlabs';
  readonly language: string; // BCP 47 language tag, default 'en-US'
  readonly speed: number; // playback speed multiplier, default 1.0
  readonly stability: number; // ElevenLabs stability param, 0.0-1.0
  readonly similarityBoost: number; // ElevenLabs similarity param, 0.0-1.0
}
```

---

## Value Objects

```typescript
interface AudioPayload {
  readonly format: AudioFormat;
  readonly durationMs: number;
  readonly sizeBytes: number;
  readonly sampleRate: number; // Hz
}

type AudioFormat = 'wav' | 'mp3' | 'opus';

interface TranscriptionResult {
  readonly text: string;
  readonly confidence: number; // 0.0-1.0
  readonly language: string; // detected language
  readonly segments: Array<{
    text: string;
    startMs: number;
    endMs: number;
    confidence: number;
  }>;
}
```

---

## Domain Events

```typescript
interface VoiceSessionStarted {
  readonly eventType: 'voice.session_started';
  readonly sessionId: string;
  readonly userId: string;
  readonly conversationId: string;
  readonly timestamp: string;
}

interface VoiceMessageProcessed {
  readonly eventType: 'voice.message_processed';
  readonly sessionId: string;
  readonly messageId: string;
  readonly userId: string;
  readonly transcriptLength: number;
  readonly totalLatencyMs: number;
  readonly timestamp: string;
}

interface VoiceSessionEnded {
  readonly eventType: 'voice.session_ended';
  readonly sessionId: string;
  readonly userId: string;
  readonly messageCount: number;
  readonly totalDurationMs: number;
  readonly avgLatencyMs: number;
  readonly timestamp: string;
}
```
