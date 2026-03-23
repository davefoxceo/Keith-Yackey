import type {
  Conversation,
  ConversationMode,
  Message,
} from '@coach-keith/shared/types/coaching';
import type { UserId } from '@coach-keith/shared/types/user';
import type { FiveDialsAssessment } from '@coach-keith/shared/types/assessment';

import { KEITH_SYSTEM_PROMPT } from '../prompts/system-prompt';
import { getModePrompt } from '../prompts/mode-prompts';
import type { ContentChunk, RAGRetriever } from './retriever';

/** Rough token estimates per character (conservative for Claude) */
const CHARS_PER_TOKEN = 4;

/** Token budget allocations */
const TOKEN_BUDGET = {
  system: 8_000,
  userProfile: 4_000,
  rag: 4_000,
  history: 8_000,
  /** Buffer to leave room for the model's response */
  responseBuffer: 4_000,
} as const;

export interface UserContext {
  userId: UserId;
  displayName: string;
  wifeName?: string;
  kidNames?: string[];
  kidsCount?: number;
  marriageDuration?: number;
  currentStage?: string;
  latestDials?: FiveDialsAssessment;
  conversationCount?: number;
  preferences?: Record<string, unknown>;
}

export interface ContextBuilderDeps {
  ragRetriever: RAGRetriever;
}

export interface BuiltContext {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  metadata: {
    ragChunksUsed: number;
    historyMessagesIncluded: number;
    estimatedTokens: number;
  };
}

export class ContextBuilder {
  private readonly retriever: RAGRetriever;

  constructor(deps: ContextBuilderDeps) {
    this.retriever = deps.ragRetriever;
  }

  /**
   * Assemble the full prompt context for a Claude API call.
   *
   * Structure:
   *   1. System prompt (Keith's voice + mode instructions)
   *   2. User profile context (name, situation, dials)
   *   3. RAG content (relevant frameworks/stories)
   *   4. Conversation history (last N messages + summary)
   */
  async buildFullContext(
    userCtx: UserContext,
    currentMessage: string,
    conversation: Conversation | null,
    mode: ConversationMode,
  ): Promise<BuiltContext> {
    // 1. Build system prompt (base + mode + user context)
    const systemParts: string[] = [KEITH_SYSTEM_PROMPT];

    // Add mode-specific instructions
    systemParts.push(getModePrompt(mode));

    // Add user profile context
    const profileContext = this.buildUserProfileContext(userCtx);
    if (profileContext) {
      systemParts.push(profileContext);
    }

    // 2. Retrieve RAG content
    const ragChunks = await this.retrieveRAGContent(currentMessage, mode);
    if (ragChunks.length > 0) {
      const ragContext = this.retriever.buildContext(ragChunks);
      const trimmedRag = this.trimToTokenBudget(
        ragContext,
        TOKEN_BUDGET.rag,
      );
      systemParts.push(trimmedRag);
    }

    // Assemble final system prompt within budget
    const fullSystem = this.trimToTokenBudget(
      systemParts.join('\n\n'),
      TOKEN_BUDGET.system + TOKEN_BUDGET.userProfile + TOKEN_BUDGET.rag,
    );

    // 3. Build conversation history
    const historyMessages = this.buildHistory(conversation);

    // 4. Add current message
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...historyMessages,
      { role: 'user' as const, content: currentMessage },
    ];

    const estimatedTokens = this.estimateTokens(fullSystem, messages);

    return {
      systemPrompt: fullSystem,
      messages,
      metadata: {
        ragChunksUsed: ragChunks.length,
        historyMessagesIncluded: historyMessages.length,
        estimatedTokens,
      },
    };
  }

  /**
   * Build the user profile section of the system prompt.
   */
  private buildUserProfileContext(ctx: UserContext): string {
    const lines: string[] = [
      '═══ USER CONTEXT ═══',
      '',
    ];

    lines.push(`Name: ${ctx.displayName}`);

    if (ctx.wifeName) {
      lines.push(`Wife's name: ${ctx.wifeName}`);
    }
    if (ctx.kidNames?.length) {
      lines.push(`Kids: ${ctx.kidNames.join(', ')} (${ctx.kidsCount ?? ctx.kidNames.length})`);
    } else if (ctx.kidsCount) {
      lines.push(`Number of kids: ${ctx.kidsCount}`);
    }
    if (ctx.marriageDuration) {
      lines.push(`Married: ${ctx.marriageDuration} years`);
    }
    if (ctx.currentStage) {
      lines.push(`Current marriage stage: ${ctx.currentStage}`);
    }

    // Engagement level
    const convCount = ctx.conversationCount ?? 0;
    if (convCount <= 3) {
      lines.push('Engagement level: NEW USER — be welcoming, explain frameworks, build trust.');
    } else if (convCount <= 10) {
      lines.push('Engagement level: ESTABLISHED — can push harder, reference past conversations.');
    } else {
      lines.push('Engagement level: VETERAN — full intensity, deep accountability, pattern recognition.');
    }

    // Five Dials snapshot
    if (ctx.latestDials) {
      lines.push('');
      lines.push('Current Five Dials Assessment:');
      for (const rating of ctx.latestDials.ratings) {
        lines.push(`  ${rating.dial}: ${rating.score}/10${rating.notes ? ` — ${rating.notes}` : ''}`);
      }
      lines.push(`  Overall: ${ctx.latestDials.overallScore}/10`);
    }

    lines.push('', '═══ END USER CONTEXT ═══');
    return lines.join('\n');
  }

  /**
   * Retrieve RAG content from Ruvector based on the user's message and mode.
   */
  private async retrieveRAGContent(
    message: string,
    mode: ConversationMode,
  ): Promise<ContentChunk[]> {
    try {
      const filters: Record<string, string[]> = {};

      // Bias retrieval toward content types relevant to the mode
      if (mode === 'CRISIS') {
        filters['contentType'] = ['framework', 'story', 'exercise'];
      } else if (mode === 'FRAMEWORK') {
        filters['contentType'] = ['framework', 'exercise'];
      }

      return await this.retriever.retrieve(
        message,
        Object.keys(filters).length > 0 ? filters : undefined,
        5,
      );
    } catch {
      // RAG failure should not prevent coaching — degrade gracefully
      console.warn('[ContextBuilder] RAG retrieval failed, proceeding without retrieved content');
      return [];
    }
  }

  /**
   * Convert conversation history to message array, respecting token budget.
   * Includes the last N messages and prepends a summary if available.
   */
  private buildHistory(
    conversation: Conversation | null,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (!conversation || conversation.messages.length === 0) {
      return [];
    }

    const maxHistoryMessages = 10;
    const allMessages = conversation.messages.filter(
      (m: Message) => m.role === 'user' || m.role === 'assistant',
    );

    // Take the last N messages
    const recentMessages = allMessages.slice(-maxHistoryMessages);

    const result: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // If there are older messages and we have a summary, include it
    if (allMessages.length > maxHistoryMessages && conversation.summary) {
      result.push({
        role: 'user' as const,
        content: `[Previous conversation summary: ${conversation.summary}]`,
      });
      result.push({
        role: 'assistant' as const,
        content:
          'Got it — I remember where we left off. Let\'s keep going.',
      });
    }

    // Add recent messages
    for (const msg of recentMessages) {
      result.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    // Trim to token budget
    return this.trimHistoryToTokenBudget(result, TOKEN_BUDGET.history);
  }

  /**
   * Trim a string to fit within a token budget.
   */
  private trimToTokenBudget(text: string, maxTokens: number): string {
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    if (text.length <= maxChars) {
      return text;
    }
    return text.slice(0, maxChars) + '\n[... content trimmed to fit context window ...]';
  }

  /**
   * Trim conversation history from the oldest messages to fit token budget.
   */
  private trimHistoryToTokenBudget(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    let totalChars = 0;

    // Walk backward from newest, keeping messages that fit
    const kept: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgChars = msg.content.length + 20; // overhead for role etc.
      if (totalChars + msgChars > maxChars) break;
      totalChars += msgChars;
      kept.unshift({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }

    return kept;
  }

  /**
   * Estimate total token count for the assembled context.
   */
  private estimateTokens(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
  ): number {
    let totalChars = systemPrompt.length;
    for (const msg of messages) {
      totalChars += msg.content.length + 20;
    }
    return Math.ceil(totalChars / CHARS_PER_TOKEN);
  }
}
