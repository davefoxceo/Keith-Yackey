# ADR-028: CI/CD Pipeline and Release Strategy

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Coach Keith AI app requires a reliable CI/CD pipeline that handles three distinct deployment targets: the NestJS backend (deployed to AWS ECS), the React Native iOS app (deployed to the App Store via TestFlight), and the React Native Android app (deployed to Google Play). Each target has different build requirements, testing strategies, and release cadences. The backend can be deployed continuously with canary rollouts, while mobile releases are gated by app store review processes and require more deliberate versioning. We need feature flags to decouple deployments from feature releases, enabling progressive rollouts and A/B testing without app store submissions.

**Decision:**
We will use GitHub Actions for CI, Fastlane for mobile builds, ECS canary deployments for the backend, and feature flags for progressive rollouts.

1. **CI Pipeline (GitHub Actions):** All code lives in a monorepo with three workspace packages: `api/` (NestJS backend), `mobile/` (React Native app), and `shared/` (TypeScript types, validation schemas). GitHub Actions workflows are triggered on pull request and push to `main`. The CI pipeline includes:
   - **Linting:** ESLint + Prettier checks across all packages
   - **Type checking:** `tsc --noEmit` for TypeScript validation
   - **Unit tests:** Jest (v29) with coverage thresholds (80% line coverage minimum)
   - **Integration tests:** Backend API tests against a PostgreSQL test container (via `testcontainers` library)
   - **Security scanning:** `npm audit` + Snyk for dependency vulnerabilities
   - **Build verification:** Docker image build for backend; Metro bundler check for mobile
   - CI runs are parallelized across packages using GitHub Actions matrix strategy, with caching for `node_modules` and Gradle/CocoaPods dependencies.

2. **Backend Deployment (ECS Canary):** On merge to `main`, the backend Docker image is built, tagged with the git SHA, and pushed to Amazon ECR. AWS CodeDeploy performs a canary deployment to ECS Fargate: 10% of traffic routes to the new task set for 10 minutes, monitored by CloudWatch alarms (error rate, latency). If alarms stay green, traffic shifts to 100%. If any alarm triggers, automatic rollback to the previous task set. Deployment takes approximately 15 minutes end-to-end.

3. **Mobile Builds (Fastlane):** Fastlane (v2.222+) manages iOS and Android build automation:
   - **iOS:** `fastlane ios beta` builds the app with Xcode 16, signs with App Store Connect API key (no manual certificate management), uploads to TestFlight. Builds are triggered manually via `workflow_dispatch` or automatically on tagged releases (`v*.*.*`).
   - **Android:** `fastlane android beta` builds the AAB via Gradle, signs with a keystore stored in GitHub Secrets, and uploads to Google Play Internal Testing track.
   - Both lanes increment build numbers automatically, generate changelogs from git commits, and upload dSYM (iOS) / mapping files (Android) to crash reporting.

4. **Feature Flags (Unleash):** We will use Unleash (v5, self-hosted on ECS) as the feature flag system for progressive rollouts. Unleash is open-source, avoiding per-seat licensing costs of LaunchDarkly ($10/seat/month). Feature flags control:
   - New feature rollouts (e.g., roll out Brotherhood community to 10% of Premium users, then 50%, then 100%)
   - A/B testing of coaching prompts or UI variations
   - Kill switches for features experiencing issues in production
   - The React Native Unleash SDK (`unleash-proxy-client-react` v4) evaluates flags locally after initial fetch, with a 30-second polling interval for updates.

5. **Release Cadence:**
   - Backend: Continuous deployment to production on every merge to `main` (multiple times per day)
   - Mobile: Bi-weekly release trains (every other Monday), with hotfix capability for critical issues
   - Feature flags enable features to be deployed in code but activated independently of the release schedule

**Consequences:**

### Pros (+)
- GitHub Actions is free for public repos and has generous free minutes for private repos (3,000 minutes/month on Team plan)
- Canary deployments catch production issues before they affect all users
- Fastlane eliminates manual, error-prone mobile build processes
- Unleash (self-hosted) provides feature flags without per-seat SaaS costs
- Monorepo structure with shared types ensures API contract consistency between backend and mobile

### Cons (-)
- Monorepo CI requires careful caching and path-based triggers to avoid running all jobs on every commit
- Self-hosted Unleash requires operational maintenance (another ECS service to manage)
- Fastlane configuration for both platforms is complex and brittle — Xcode/Gradle updates frequently break build lanes
- ECS canary deployments via CodeDeploy add configuration complexity over simple rolling updates

### Tradeoffs
We chose standard, well-documented tooling (GitHub Actions, Fastlane, CodeDeploy) over custom build infrastructure or more opinionated platforms (Vercel, Railway). This means more configuration upfront but full control over the pipeline and no vendor lock-in. We chose self-hosted Unleash over LaunchDarkly for cost reasons — LaunchDarkly's developer-friendly experience is superior, but the per-seat cost is hard to justify at the early stage. If the team grows beyond 10 engineers, we will re-evaluate the build-vs-buy decision for feature flags.
