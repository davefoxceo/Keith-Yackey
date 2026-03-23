# ADR-029: Data Privacy and Compliance Architecture

**Status:** Proposed
**Date:** 2026-03-22

**Context:**
The Coach Keith AI app handles sensitive personal data: users share deeply personal information during AI coaching sessions (goals, struggles, fears, relationship issues, financial situations). This data requires a higher standard of privacy protection than a typical consumer app. Users must trust that their coaching conversations are private, secure, and deletable on request. Additionally, the app will process payment information (via RevenueCat/Stripe, not stored directly), and will likely need to comply with CCPA (California users), GDPR (if/when expanding internationally), and potentially HIPAA-adjacent standards if coaching content touches mental health topics. SOC 2 Type II certification is targeted for Year 2 to build enterprise trust and support potential B2B partnerships (coaching programs offered through employers).

**Decision:**
We will implement a defense-in-depth privacy architecture with encryption at rest and in transit, dedicated PII storage patterns, event-sourced data lifecycle management, and a clear right-to-deletion implementation.

1. **Encryption at Rest (AES-256):** All data stored in PostgreSQL uses AWS RDS encryption at rest (AES-256) via AWS KMS-managed keys. S3 buckets storing media, recordings, and backups use SSE-S3 (AES-256) encryption by default. Redis ElastiCache uses at-rest encryption with AWS-managed keys. Pinecone vector store uses its built-in encryption at rest. Beyond infrastructure-level encryption, PII columns (see below) use application-level encryption via `pgcrypto` extension for an additional layer of protection.

2. **Encryption in Transit (TLS 1.3):** All external communication uses TLS 1.3 exclusively. The Application Load Balancer terminates TLS with AWS Certificate Manager certificates. Internal service communication within the VPC uses TLS between ECS tasks and RDS/ElastiCache (enforced via security group rules and `sslmode=require` on database connections). The mobile app enforces certificate pinning via `react-native-ssl-pinning` to prevent MITM attacks.

3. **PII Storage Pattern:** Personally identifiable information is stored in dedicated encrypted columns within the `users` table and a separate `user_profiles` table. PII fields include: full name, email, phone number, date of birth, timezone, and profile photo URL. These columns use application-level AES-256 encryption via a NestJS `@Encrypted()` decorator that transparently encrypts on write and decrypts on read. Encryption keys are stored in AWS Secrets Manager and rotated quarterly. Coaching conversation content is stored in the `conversation_messages` table with application-level encryption, as it may contain sensitive personal disclosures.

4. **Event-Sourced Data Lifecycle:** User actions that create, modify, or delete data emit domain events to an internal event log (`domain_events` table: id, aggregate_type, aggregate_id, event_type, payload, created_at). This event-sourcing pattern supports:
   - Audit trail for compliance investigations
   - Soft deletion via tombstone events (`UserDataDeleted`, `ConversationPurged`) rather than hard deletes
   - Data reconstruction for debugging (within retention windows)
   - GDPR Article 17 compliance by proving deletion occurred

5. **Right-to-Deletion Implementation:** When a user requests account deletion (via in-app setting or support request):
   - A `DeletionRequested` event is emitted with a 30-day grace period (user can cancel)
   - After grace period, a `DeletionExecuted` event triggers a cascading delete workflow:
     - User profile and PII: hard deleted from `users` and `user_profiles`
     - Coaching conversations: hard deleted from `conversation_messages`, corresponding vectors deleted from Pinecone
     - Community posts: anonymized (author set to "Deleted User"), content retained for community continuity
     - Accountability messages: hard deleted
     - Analytics events: anonymized (user_id replaced with hash)
   - A `DeletionCompleted` tombstone event records that deletion occurred, retained indefinitely for compliance proof
   - The entire workflow is idempotent and can be re-run if any step fails

6. **SOC 2 Type II Preparation:** Year 1 activities include: implementing access logging for all infrastructure, enforcing MFA for all team members, documenting security policies, and conducting a gap assessment with a SOC 2 auditor. Year 2 targets the formal audit.

**Consequences:**

### Pros (+)
- Defense-in-depth encryption protects data even if one layer is compromised
- Application-level PII encryption means database administrators cannot read sensitive data without application keys
- Event-sourced deletion provides a verifiable audit trail for compliance
- 30-day grace period reduces accidental data loss from impulsive deletion requests
- Architecture is designed to support GDPR, CCPA, and SOC 2 from the start rather than retrofitting later

### Cons (-)
- Application-level encryption adds latency to every PII read/write operation (~1-2ms per field)
- Encrypted columns cannot be indexed or searched directly, requiring alternative patterns (encrypted hash indexes for email lookup)
- Event-sourcing adds storage overhead and complexity to the data model
- SOC 2 preparation requires dedicated effort and budget (~$30-50K for audit in Year 2)
- Quarterly key rotation requires a managed process and testing

### Tradeoffs
We chose compliance-forward architecture over development velocity. Many startups defer privacy architecture and retrofit it later, but the sensitive nature of coaching conversations makes privacy a foundational requirement, not a nice-to-have. The overhead of application-level encryption, event sourcing, and deletion workflows adds approximately 2-3 weeks to the initial development timeline but avoids a costly and risky retrofit when the app reaches a scale where compliance becomes non-negotiable. Users sharing their deepest vulnerabilities with an AI coach must trust that their data is treated with the highest standard of care.
