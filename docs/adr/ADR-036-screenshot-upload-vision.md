# ADR-036: Screenshot Upload with Claude Vision Analysis

**Status:** Proposed
**Date:** 2026-03-24
**Related:** ADR-009 (RAG Pipeline), ADR-032 (Pi-Brain Persistence)

---

## Context

A core use case for Coach Keith AI is helping men interpret and respond to text message conversations with their wives. Currently, users must manually type out or describe the conversation, which is slow, loses tone and context, and discourages engagement. Keith's live coaching sessions frequently involve clients sharing their phone screen -- the AI experience should mirror this.

Since we already use Claude as our LLM provider, we can leverage Claude's native vision capability to analyze uploaded images without adding a new service dependency.

---

## Decision

**Allow users to upload screenshots (text messages, social media DMs, emails) directly in the chat interface. Use Claude's multimodal API to analyze the image alongside a text prompt. Store only the AI's text analysis in the conversation history, not the image itself.**

### User Flow

1. User taps the camera/image button in the chat input area (or drags and drops an image)
2. A preview of the image appears above the input field
3. User optionally types additional context ("She sent this after I got home late")
4. User sends the message
5. The image and text are sent to Claude's API as a multimodal message
6. Coach Keith AI responds with analysis of the conversation dynamics, tone, and suggested responses
7. The AI's text response is stored in conversation history
8. The image is discarded from the server

### Image Constraints

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max file size | 5 MB | Claude API limit is 20MB but 5MB covers all phone screenshots |
| Formats | PNG, JPG, WEBP | Standard screenshot formats across iOS and Android |
| Max dimensions | 4096 x 4096 | Claude API maximum, no resize needed for phone screenshots |
| Retention | Transient only | Privacy -- images are processed and immediately deleted |

### Privacy Model

Images are **never persisted** to disk, database, or object storage. The lifecycle:

1. Image uploaded via multipart form to the API server (held in memory via multer)
2. Image base64-encoded and sent to Claude API in the messages array
3. Claude returns text analysis
4. Image buffer is dereferenced and garbage collected
5. Only the text analysis and a metadata note ("User shared a screenshot") are stored in conversation history

This protects user privacy -- intimate text conversations between spouses should never be stored on our servers.

---

## Implementation

### Frontend (Chat Input Component)

```
- Add image button (camera icon) next to send button
- Drag-and-drop zone over the chat input area
- Image preview with remove button before sending
- Loading state while image is being analyzed (takes 2-4 seconds)
- File input accepts: image/png, image/jpeg, image/webp
- Client-side validation: file size < 5MB, correct MIME type
```

### Backend (NestJS)

```
src/
  chat/
    chat.controller.ts        # Updated: POST /chat/message accepts multipart
    chat.service.ts            # Updated: builds multimodal Claude message
    image-upload.pipe.ts       # Validates file size, type, dimensions
```

**Multer configuration:**
- Storage: `memoryStorage()` (no disk writes)
- File size limit: 5MB
- File filter: PNG, JPG, WEBP only

### Claude API Multimodal Message

```typescript
const message = {
  role: 'user',
  content: [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: file.mimetype,
        data: file.buffer.toString('base64'),
      },
    },
    {
      type: 'text',
      text: `${systemContext}\n\nThe user shared a screenshot of a conversation. Analyze the dynamics, tone, and subtext. Then provide coaching advice in Keith's voice.\n\nUser's additional context: ${userMessage}`,
    },
  ],
};
```

### Feature Gating

Screenshot upload is a **Premium and Elite** feature (ADR-034). The `@RequiresTier('premium')` decorator is applied to the upload endpoint. Core tier users see the camera button grayed out with a tooltip: "Upgrade to Premium to share screenshots."

---

## Consequences

### Positive

- Removes the biggest friction point in the coaching chat experience
- Users get analysis of tone, subtext, and dynamics that they would miss when paraphrasing
- No new service dependency -- Claude already powers the chat
- Privacy-first design -- no image storage means no image data breach risk
- Mirrors Keith's real coaching workflow where clients share their screens

### Negative

- Multimodal API calls cost more than text-only (~2x token usage for image analysis)
- Image analysis adds 1-3 seconds of latency compared to text-only messages
- Users on slow connections may have poor upload experience (mitigation: compress client-side if > 2MB)
- No ability to reference a previously shared screenshot (since images are not stored)

### Risks

- Users could upload inappropriate or non-relevant images (mitigation: Claude's built-in content filtering handles this)
- Memory pressure on the server if many concurrent uploads are held in memory (mitigation: limit concurrent uploads per instance, 5MB cap keeps individual payloads small)
- If Claude API is down, screenshot analysis fails entirely (mitigation: queue the message and retry, or prompt user to describe the screenshot in text)
