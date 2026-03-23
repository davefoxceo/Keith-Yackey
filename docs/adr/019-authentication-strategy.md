# ADR-019: Authentication Strategy

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
Coach Keith AI is a mobile application (React Native / Expo) that requires user authentication to protect sensitive personal and marriage data. Apple requires all iOS apps that offer third-party sign-in to also support Sign in with Apple. Google sign-in is expected by Android users. Email/password authentication is needed as a fallback. The auth system must integrate cleanly with the subscription/billing system (ADR-020), issue JWT tokens for API authentication, support secure account recovery, and handle token refresh for seamless mobile sessions. The auth provider must also integrate well with the PostgreSQL database where user profiles and conversation data reside.

**Decision:**
Use Supabase Auth as the authentication provider, leveraging its built-in support for social login, JWT token management, and native PostgreSQL integration.

**Supabase Auth Configuration:**

- **Project setup:** Supabase project hosted on Supabase Cloud (free tier sufficient for MVP, supports up to 50,000 monthly active users)
- **Auth providers enabled:**
  - **Apple Sign-In:** Required for iOS App Store compliance. Configured via Apple Developer Program with Service ID and private key. Supabase handles the OAuth flow and token exchange.
  - **Google Sign-In:** Configured via Google Cloud Console OAuth 2.0 credentials. Supports both Android (using SHA-1 fingerprint) and iOS (using reversed client ID).
  - **Email/Password:** Built-in Supabase provider with email confirmation flow. Password requirements: minimum 8 characters, at least one number and one special character.
- **JWT Configuration:**
  - Token expiry: 1 hour (access token), 7 days (refresh token)
  - Custom JWT claims include: `user_id`, `subscription_tier`, `email`
  - JWT secret managed by Supabase, rotatable via dashboard
  - Refresh token rotation enabled (each refresh invalidates the previous token)

**Mobile Integration (React Native / Expo):**
```typescript
// Using @supabase/supabase-js with expo-secure-store for token persistence
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // not needed for mobile
  },
});
```

**Account Recovery:**
- Email-based password reset via Supabase's built-in magic link flow
- For social login users (Apple/Google): recovery handled by the social provider
- Account deletion: GDPR-compliant delete flow that removes all user data (profile, conversations, assessments) via cascading deletes in PostgreSQL

**API Authentication Flow:**
1. Mobile app authenticates with Supabase (social login or email/password)
2. Supabase returns JWT access token + refresh token
3. App includes JWT in `Authorization: Bearer <token>` header for all API requests
4. Backend API (Node.js/Express or Fastify) validates JWT using Supabase's public JWKS endpoint
5. Middleware extracts `user_id` from JWT claims and attaches to request context
6. Refresh token rotation handled transparently by the Supabase client SDK

**Row Level Security (RLS):**
- Supabase's PostgreSQL RLS policies ensure users can only access their own data
- Policies applied to all user-facing tables: `user_profiles`, `conversations`, `messages`, `assessment_events`
- Example policy: `CREATE POLICY user_own_data ON conversations FOR ALL USING (user_id = auth.uid())`
- RLS provides defense-in-depth beyond application-level authorization checks

**Supabase Auth vs. Alternatives Considered:**
- **Firebase Auth:** More mature ecosystem, but ties us to Google Cloud and Firestore. Poor fit with PostgreSQL-centric architecture.
- **Auth0:** Enterprise-grade but expensive ($23/month for 1,000 MAU on paid plans). Overkill for MVP.
- **Clerk:** Excellent DX but newer, less battle-tested, and higher cost at scale.
- **Custom JWT auth:** Maximum flexibility but significant security risk and development effort. Not appropriate for sensitive personal data.
- **AWS Cognito:** Free tier generous, but notoriously poor developer experience and complex configuration.

**Consequences:**

### Pros (+)
- Free tier supports up to 50,000 MAU — more than sufficient for MVP and initial growth
- Native PostgreSQL integration — auth users live in the same database as application data
- Built-in Apple and Google sign-in support with straightforward configuration
- Row Level Security provides database-level access control
- Open source (can self-host if needed for data sovereignty or cost)
- Supabase client SDK handles token refresh, session persistence, and auth state management
- JWT-based auth works well with serverless API backends (stateless validation)

### Cons (-)
- Smaller ecosystem than Firebase — fewer third-party integrations and community packages
- Supabase Auth documentation can be sparse for edge cases (Apple sign-in refresh, account linking)
- Vendor dependency on Supabase Cloud for managed hosting (mitigated by self-host option)
- RLS policies add complexity to database schema and can be difficult to debug
- Social login token refresh behavior varies by provider and can cause unexpected logouts

### Tradeoffs
The primary tradeoff is **PostgreSQL alignment over ecosystem breadth**. Firebase Auth has a larger community and more battle-tested social login implementations, but it would introduce a second database (Firestore) into an architecture that is otherwise fully PostgreSQL-based. Supabase Auth keeps authentication data in the same PostgreSQL instance as user profiles, conversations, and assessments, enabling simple JOIN queries, consistent backup strategies, and unified RLS policies. The smaller ecosystem is acceptable because the auth requirements are straightforward (three providers, JWT tokens, basic recovery) and do not require advanced features like adaptive MFA or organization management that enterprise-focused providers offer.
