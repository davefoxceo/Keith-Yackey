# ADR-001: Cross-Platform Mobile Framework Selection

**Status:** Proposed
**Date:** 2026-03-22

**Context:**

The Coach Keith AI mobile app must ship on iOS first (Phase 1, targeting Q3 2026 launch) with Android following in Phase 2 (Q1 2027). The founding engineering team is strongest in TypeScript/JavaScript. We evaluated three primary options:

1. **React Native (Expo)** — Cross-platform JavaScript/TypeScript framework with managed build tooling via Expo Application Services (EAS).
2. **Flutter** — Google's cross-platform framework using Dart, known for pixel-perfect UI rendering.
3. **Native Swift (iOS) + Kotlin (Android)** — Fully native implementations for each platform.

Key considerations include: time-to-market for an iOS-first MVP, ability to share code and types with a TypeScript backend, access to native device APIs (notifications, biometrics, camera for journaling), and the sensitivity of the coaching content domain (mental health, relationships, personal development) which may trigger additional App Store review scrutiny.

The app's primary interactions are text-based (AI chat, journaling, assessments) with some media playback (podcast clips, video snippets). Heavy 3D rendering, complex animations, or game-like interfaces are not required for V1.

**Decision:**

We will use **React Native 0.76+** with the **Expo SDK 52** managed workflow as our cross-platform mobile framework. TypeScript will be the primary language (strict mode enabled). Key libraries include:

- **Expo Router v4** for file-based navigation
- **React Native Reanimated 3** for performant animations
- **Expo Notifications** for push notification handling
- **Expo SecureStore** for sensitive token storage
- **React Query (TanStack Query v5)** for server state management
- **Zustand** for client-side state management
- **EAS Build + EAS Submit** for CI/CD to App Store and Google Play

The Expo managed workflow will be used initially. If native module requirements exceed Expo's capabilities (e.g., custom native streaming for AI responses), we will eject to a bare workflow using Expo's config plugins rather than abandoning the framework entirely.

**Consequences:**

### Pros (+)
- **TypeScript everywhere**: Shared types, interfaces, and validation schemas (via Zod) between mobile app and NestJS backend, reducing contract drift and enabling a monorepo structure.
- **Single codebase for iOS + Android**: Estimated 85-90% code sharing between platforms, cutting Phase 2 Android development from ~4 months to ~4-6 weeks.
- **Expo simplifies DevOps**: EAS Build eliminates the need to maintain local Xcode/Android Studio build environments. Over-the-air (OTA) updates via `expo-updates` allow critical fixes without App Store review cycles.
- **Large talent pool**: React Native is the most widely adopted cross-platform framework, making future hiring easier.
- **Mature ecosystem**: Well-supported libraries for chat UIs (`react-native-gifted-chat`), markdown rendering, audio playback, and biometric authentication.

### Cons (-)
- **Slightly reduced native feel**: Despite improvements in the New Architecture (Fabric renderer, TurboModules), React Native still has a perceptible gap versus fully native apps in complex gesture handling and navigation transitions.
- **Animation performance ceiling**: While Reanimated 3 runs animations on the UI thread, extremely complex coordinated animations may still drop frames on lower-end devices.
- **App Store review risk**: Apps dealing with sensitive personal content (coaching around relationships, trauma, masculinity) face heightened App Store scrutiny. React Native apps occasionally face review delays, though this is increasingly rare with Expo's compliance tooling.
- **Bridge overhead**: Despite the New Architecture reducing bridge overhead significantly, high-frequency data passing (e.g., real-time audio waveform visualization) may require custom native modules.

### Tradeoffs
We are explicitly prioritizing **speed-to-market and developer velocity** over pixel-perfect native polish for V1. The coaching app's primary interface is conversational text, which React Native handles excellently. If user feedback in Phase 1 reveals meaningful UX gaps attributable to the framework (not just design), we can invest in custom native modules or evaluate a native rewrite for specific screens in Phase 3. The cost of potentially rebuilding one or two screens natively is far lower than the cost of maintaining two separate native codebases from day one with a small team.
