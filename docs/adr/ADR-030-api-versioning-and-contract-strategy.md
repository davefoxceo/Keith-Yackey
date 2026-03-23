# ADR-030: API Versioning and Contract Strategy

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Coach Keith AI app's React Native mobile client communicates with the NestJS backend via a REST API. Mobile apps present a unique API versioning challenge: unlike web apps where all users are on the latest version, mobile users may run outdated app versions for weeks or months after an update is available. The backend must support multiple client versions simultaneously without breaking older clients. We evaluated three versioning strategies: URL path versioning (`/api/v1/`), header-based versioning (`Accept: application/vnd.coachkeith.v1+json`), and GraphQL (which avoids versioning through schema evolution). We also considered whether to adopt GraphQL entirely instead of REST, given its flexibility for mobile clients.

**Decision:**
We will use URL path versioning with OpenAPI 3.1 as the API contract specification and auto-generated TypeScript clients for the mobile app.

1. **URL Path Versioning:** All API endpoints are prefixed with a version path: `/api/v1/coaching/sessions`, `/api/v1/community/posts`, etc. The version represents a major API contract — breaking changes (removing fields, changing response shapes, altering authentication flows) require a new version path (`/api/v2/`). Non-breaking changes (adding optional fields, new endpoints, adding optional query parameters) are made within the current version. NestJS route prefixing is configured at the module level via `@Controller({ path: 'coaching', version: '1' })` using NestJS's built-in versioning support (`VersioningType.URI`).

2. **OpenAPI 3.1 Specification:** The API contract is defined as an OpenAPI 3.1 spec, generated automatically from NestJS controllers and DTOs using `@nestjs/swagger` (v7+). The spec includes request/response schemas, authentication requirements, error response formats, and example payloads. The OpenAPI spec is version-controlled alongside application code and serves as the single source of truth for the API contract. A CI check validates that the generated spec matches the committed spec file, catching unintentional contract changes.

3. **Generated TypeScript Client:** The OpenAPI spec is used to auto-generate a TypeScript API client via `openapi-typescript-codegen` (v0.27+) or `@hey-api/openapi-ts`. The generated client is published as an internal npm package (`@coachkeith/api-client`) consumed by the React Native app. This eliminates manual API call code, ensures type safety across the stack, and catches contract mismatches at compile time. The generated client includes typed request/response interfaces, API method functions, and error types.

4. **Version Lifecycle Policy:**
   - Each API version is supported for a minimum of 6 months after a successor version is released
   - Deprecated versions return a `Sunset` header with the planned removal date and a `Deprecation` header per RFC 8594
   - The mobile app checks for API deprecation headers and displays an upgrade prompt when the user's API version is approaching sunset
   - Analytics track API version usage to determine when it is safe to remove a deprecated version (target: < 1% of active users)

5. **Error Response Contract:** All API errors follow a consistent format across versions:
   ```json
   {
     "statusCode": 403,
     "error": "ENTITLEMENT_REQUIRED",
     "message": "This feature requires a Premium subscription",
     "details": {
       "requiredEntitlement": "brotherhood_access",
       "upgradeUrl": "coachkeith://upgrade?tier=premium"
     }
   }
   ```
   Error codes are documented in the OpenAPI spec and are considered part of the API contract — changing an error code is a breaking change.

6. **Why Not GraphQL:** GraphQL was seriously considered for its ability to avoid versioning through additive schema changes and its query flexibility for mobile clients (requesting only needed fields to minimize payload size). We chose REST with OpenAPI because: (a) the team has deeper REST/NestJS expertise, (b) the API surface is relatively small (~30-40 endpoints in V1), (c) GraphQL's flexibility can become a liability for caching (no HTTP caching without persisted queries), and (d) the generated TypeScript client provides equivalent type safety without GraphQL's toolchain complexity (Apollo Client, codegen, schema stitching).

**Consequences:**

### Pros (+)
- URL path versioning is explicit, debuggable (visible in logs, URLs), and universally understood
- OpenAPI spec as contract ensures backend and mobile stay synchronized
- Generated TypeScript client eliminates hand-written API call code and catches contract drift at compile time
- 6-month version support window gives mobile users ample time to update
- NestJS built-in versioning support makes implementation straightforward

### Cons (-)
- URL path versioning can lead to code duplication when supporting multiple versions simultaneously (mitigated by version-specific controller layers delegating to shared services)
- Mobile clients cannot request partial responses (unlike GraphQL), potentially over-fetching data on slow connections
- OpenAPI spec generation from decorators can be fragile — complex DTOs sometimes require manual annotation
- Generated clients need regeneration on every API change, adding a step to the development workflow

### Tradeoffs
We chose explicit URL path versioning over GraphQL's schema evolution flexibility. GraphQL would eliminate the need for versioning entirely and reduce mobile data usage through field selection, but introduces significant toolchain complexity (Apollo Client, code generation, cache normalization, persisted queries for security) that is disproportionate for a 30-40 endpoint API. REST with OpenAPI and generated clients provides equivalent type safety with a simpler mental model. If the API surface grows significantly or mobile performance on slow networks becomes a concern, we will re-evaluate GraphQL for specific high-query-volume endpoints.
