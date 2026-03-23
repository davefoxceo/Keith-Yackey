import type { UserId } from './user';

/** Branded string type for conversation identifiers. */
export type ConversationId = string & { readonly __brand: 'ConversationId' };

/** Branded string type for message identifiers. */
export type MessageId = string & { readonly __brand: 'MessageId' };

export enum ConversationMode {
  FREE_CHAT = 'FREE_CHAT',
  CRISIS = 'CRISIS',
  FRAMEWORK = 'FRAMEWORK',
  ACCOUNTABILITY = 'ACCOUNTABILITY',
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  role: MessageRole;
  content: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export type ConversationStatus = 'active' | 'completed' | 'archived';

export interface Conversation {
  id: ConversationId;
  userId: UserId;
  mode: ConversationMode;
  messages: Message[];
  status: ConversationStatus;
  startedAt: Date;
  updatedAt: Date;
  summary?: string;
}

export type SafetyFlag =
  | 'crisis_detected'
  | 'harmful_content'
  | 'manipulation_detected';

export interface SafetyCheckResult {
  passed: boolean;
  flags: SafetyFlag[];
  resourcesProvided?: string[];
}

export interface ContentRecommendation {
  contentId: string;
  contentType: string;
  title: string;
  relevanceScore: number;
  reason: string;
}

export interface AIResponse {
  content: string;
  suggestedDialAdjustments: Record<string, number>;
  contentRecommendations: ContentRecommendation[];
  safetyFlags: SafetyFlag[];
}
