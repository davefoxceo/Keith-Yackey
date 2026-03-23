export { CoachKeith } from './coach';
export type { CoachConfig, ConversationStore } from './coach';

export { KEITH_SYSTEM_PROMPT } from './prompts/system-prompt';
export { getModePrompt, MODE_PROMPTS } from './prompts/mode-prompts';

export { RAGRetriever } from './rag/retriever';
export type {
  RuvectorClient,
  SearchResult,
  RetrievalFilters,
  ContentChunk,
} from './rag/retriever';

export { ContextBuilder } from './rag/context-builder';
export type { UserContext, BuiltContext, ContextBuilderDeps } from './rag/context-builder';

export { SafetyGuardrails } from './safety/guardrails';
export type { CrisisSeverity, CrisisDetection, CrisisResource } from './safety/guardrails';

export { FeedbackProcessor } from './learning/feedback-processor';
export type {
  ConversationFeedback,
  DialChange,
  RetrievalFeedback,
  LearningSignal,
} from './learning/feedback-processor';
