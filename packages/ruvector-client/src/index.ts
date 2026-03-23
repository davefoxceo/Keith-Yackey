/**
 * @coach-keith/ruvector-client
 *
 * Typed, Coach Keith AI-specific interface for the Ruvector self-learning
 * vector database.  Wraps the `ruvector` npm library and provides:
 *
 *  - RuvectorClient:             Core DB connection and collection management.
 *  - LearningEngine:             SONA self-learning integration.
 *  - CoachingKnowledgeStore:     RAG storage for podcasts, books, frameworks.
 *  - ConversationLearningStore:  Self-improving conversation memory.
 *  - UserProfileStore:           Profile embeddings and accountability matching.
 */

// Core client
export { RuvectorClient } from './client';
export type {
  RuvectorClientConfig,
  SonaConfigOverrides,
  CollectionHandle,
  CollectionName,
} from './client';

// Learning engine
export { LearningEngine } from './learning';
export type {
  LearningSignal,
  LearningSignalKind,
  LearningMetrics,
  OptimizedSearchParams,
} from './learning';

// Domain stores
export { CoachingKnowledgeStore } from './collections/coaching-knowledge';
export type {
  ContentChunkInput,
  ContentChunkMetadata,
  ContentSearchResult,
  ContentSearchOptions,
  ContentSourceType,
  DialType,
} from './collections/coaching-knowledge';

export { ConversationLearningStore } from './collections/conversation-learning';
export type {
  ConversationRecord,
  UserFeedback,
  ConversationOutcome,
  PastConversationResult,
} from './collections/conversation-learning';

export { UserProfileStore } from './collections/user-profiles';
export type {
  UserProfileInput,
  SimilarUserResult,
} from './collections/user-profiles';
