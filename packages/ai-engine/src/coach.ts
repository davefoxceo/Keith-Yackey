import Anthropic from '@anthropic-ai/sdk';
import type {
  Conversation,
  ConversationId,
  ConversationMode,
  AIResponse,
  SafetyFlag,
} from '@coach-keith/shared/types/coaching';
import { ConversationMode as Mode } from '@coach-keith/shared/types/coaching';
import type { UserId } from '@coach-keith/shared/types/user';
import type { DialType } from '@coach-keith/shared/types/assessment';

import { ContextBuilder, type UserContext } from './rag/context-builder';
import { RAGRetriever, type RuvectorClient } from './rag/retriever';
import { SafetyGuardrails } from './safety/guardrails';
import {
  FeedbackProcessor,
  type ConversationFeedback,
  type DialChange,
} from './learning/feedback-processor';

/**
 * Configuration for the CoachKeith AI engine.
 */
export interface CoachConfig {
  /** Anthropic API key */
  apiKey: string;
  /** Ruvector client instance for RAG retrieval */
  ruvectorClient: RuvectorClient;
  /** Claude model to use (defaults to claude-sonnet-4-20250514) */
  model?: string;
  /** Maximum tokens for response generation */
  maxResponseTokens?: number;
  /** Ruvector collection for coaching content */
  contentCollection?: string;
  /** Ruvector collection for feedback signals */
  feedbackCollection?: string;
}

/**
 * Callback interface for loading and persisting conversation state.
 * The consuming application provides these so the engine stays storage-agnostic.
 */
export interface ConversationStore {
  getConversation(conversationId: ConversationId): Promise<Conversation | null>;
  saveConversation(conversation: Conversation): Promise<void>;
  getUserContext(userId: UserId): Promise<UserContext>;
}

/**
 * CoachKeith — The main entry point for the AI coaching engine.
 *
 * Orchestrates Claude API calls with RAG retrieval from Ruvector,
 * manages Keith Yackey's coaching personality, and applies safety guardrails.
 */
export class CoachKeith {
  private readonly anthropic: Anthropic;
  private readonly model: string;
  private readonly maxResponseTokens: number;
  private readonly contextBuilder: ContextBuilder;
  private readonly guardrails: SafetyGuardrails;
  private readonly feedbackProcessor: FeedbackProcessor;
  private readonly retriever: RAGRetriever;

  private conversationStore: ConversationStore | null = null;

  constructor(config: CoachConfig) {
    this.anthropic = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? 'claude-sonnet-4-20250514';
    this.maxResponseTokens = config.maxResponseTokens ?? 1024;

    this.retriever = new RAGRetriever(
      config.ruvectorClient,
      config.contentCollection,
    );

    this.contextBuilder = new ContextBuilder({
      ragRetriever: this.retriever,
    });

    this.guardrails = new SafetyGuardrails();

    this.feedbackProcessor = new FeedbackProcessor(
      config.ruvectorClient,
      config.feedbackCollection,
    );
  }

  /**
   * Set the conversation store for loading/persisting conversation state.
   * Must be set before calling chat(), startConversation(), etc.
   */
  setConversationStore(store: ConversationStore): void {
    this.conversationStore = store;
  }

  /**
   * Main coaching method — send a message and get Coach Keith's response.
   */
  async chat(
    userId: UserId,
    message: string,
    conversationId?: ConversationId,
  ): Promise<AIResponse> {
    this.requireStore();

    // 1. Pre-check for crisis indicators
    const messageCheck = this.guardrails.checkMessage(message);
    const safetyFlags: SafetyFlag[] = [...messageCheck.flags];

    // 2. Load conversation and user context
    const conversation = conversationId
      ? await this.conversationStore!.getConversation(conversationId)
      : null;

    const userCtx = await this.conversationStore!.getUserContext(userId);
    const mode = conversation?.mode ?? Mode.FREE_CHAT;

    // 3. If crisis detected, potentially switch to crisis mode
    const effectiveMode =
      messageCheck.flags.includes('crisis_detected') && mode !== Mode.CRISIS
        ? Mode.CRISIS
        : mode;

    // 4. Build full context (system prompt + user context + RAG + history)
    const context = await this.contextBuilder.buildFullContext(
      userCtx,
      message,
      conversation,
      effectiveMode,
    );

    // 5. If crisis with resources, inject them into the system prompt
    let systemPrompt = context.systemPrompt;
    if (messageCheck.resourcesProvided?.length) {
      systemPrompt += `\n\n⚠️ CRISIS DETECTED — Include these resources in your response:\n${messageCheck.resourcesProvided.join('\n')}`;
    }

    // 6. Call Claude API
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxResponseTokens,
      system: systemPrompt,
      messages: context.messages,
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // 7. Post-check response for harmful content
    const responseCheck = this.guardrails.checkResponse(responseText);
    if (!responseCheck.passed) {
      safetyFlags.push(...responseCheck.flags);
    }

    // 8. If response failed safety check, regenerate with stronger guardrails
    let finalResponse = responseText;
    if (!responseCheck.passed) {
      finalResponse = await this.regenerateWithGuardrails(
        systemPrompt,
        context.messages,
        responseCheck.flags,
      );
    }

    return {
      content: finalResponse,
      suggestedDialAdjustments: {},
      contentRecommendations: [],
      safetyFlags,
    };
  }

  /**
   * Start a new conversation in a specific coaching mode.
   */
  async startConversation(
    userId: UserId,
    mode: ConversationMode,
  ): Promise<AIResponse> {
    this.requireStore();

    const userCtx = await this.conversationStore!.getUserContext(userId);

    const openingPrompts: Record<ConversationMode, string> = {
      [Mode.FREE_CHAT]: `The user ${userCtx.displayName} just started a new coaching conversation. Greet them warmly, reference their situation if you know it, and ask what's on their mind today.`,
      [Mode.CRISIS]: `The user ${userCtx.displayName} has indicated they are in a crisis situation. Follow the crisis stabilization protocol. Be calm, steady, and empathetic. Ask what's happening.`,
      [Mode.FRAMEWORK]: `The user ${userCtx.displayName} wants to learn about one of Keith's frameworks. Ask which framework they'd like to explore, or suggest one based on their current dial scores.`,
      [Mode.ACCOUNTABILITY]: `The user ${userCtx.displayName} is checking in for accountability. Reference any previous commitments and ask how things went.`,
    };

    const context = await this.contextBuilder.buildFullContext(
      userCtx,
      openingPrompts[mode],
      null,
      mode,
    );

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxResponseTokens,
      system: context.systemPrompt,
      messages: [{ role: 'user', content: openingPrompts[mode] }],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content: responseText,
      suggestedDialAdjustments: {},
      contentRecommendations: [],
      safetyFlags: [],
    };
  }

  /**
   * Switch an existing conversation to a new coaching mode.
   */
  async switchMode(
    conversationId: ConversationId,
    newMode: ConversationMode,
  ): Promise<AIResponse> {
    this.requireStore();

    const conversation =
      await this.conversationStore!.getConversation(conversationId);

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const userCtx = await this.conversationStore!.getUserContext(
      conversation.userId,
    );

    const transitionMessage = `[System: Conversation mode switching from ${conversation.mode} to ${newMode}. Acknowledge the transition naturally and adjust your approach.]`;

    const context = await this.contextBuilder.buildFullContext(
      userCtx,
      transitionMessage,
      conversation,
      newMode,
    );

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxResponseTokens,
      system: context.systemPrompt,
      messages: [
        ...context.messages,
        { role: 'user', content: transitionMessage },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content: responseText,
      suggestedDialAdjustments: {},
      contentRecommendations: [],
      safetyFlags: [],
    };
  }

  /**
   * Generate a personalized morning kickstart prompt for a user.
   */
  async generateDailyPrompt(userId: UserId): Promise<AIResponse> {
    this.requireStore();

    const userCtx = await this.conversationStore!.getUserContext(userId);

    const dailyPromptRequest = `Generate a personalized morning kickstart message for ${userCtx.displayName}.
This should be 2-4 sentences that:
- Reference his current dial scores or recent progress
- Include one micro-challenge for the day
- Be energizing and slightly provocative
- Feel like a text from a coach who knows him

${userCtx.wifeName ? `His wife's name is ${userCtx.wifeName}.` : ''}
${userCtx.latestDials ? `His weakest dial right now is the one with the lowest score.` : ''}`;

    const context = await this.contextBuilder.buildFullContext(
      userCtx,
      dailyPromptRequest,
      null,
      Mode.ACCOUNTABILITY,
    );

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 300,
      system: context.systemPrompt,
      messages: [{ role: 'user', content: dailyPromptRequest }],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content: responseText,
      suggestedDialAdjustments: {},
      contentRecommendations: [],
      safetyFlags: [],
    };
  }

  /**
   * Generate personalized evening reflection questions for a user.
   */
  async generateReflectionQuestions(userId: UserId): Promise<AIResponse> {
    this.requireStore();

    const userCtx = await this.conversationStore!.getUserContext(userId);

    const reflectionRequest = `Generate 3 personalized evening reflection questions for ${userCtx.displayName}.
These should:
- Help him evaluate how he showed up today across his dials
- Be specific to his situation, not generic
- Include one question about his relationship with ${userCtx.wifeName ?? 'his wife'}
- End with a forward-looking question about tomorrow
- Be in Keith's voice — direct, warm, slightly provocative`;

    const context = await this.contextBuilder.buildFullContext(
      userCtx,
      reflectionRequest,
      null,
      Mode.ACCOUNTABILITY,
    );

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 400,
      system: context.systemPrompt,
      messages: [{ role: 'user', content: reflectionRequest }],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content: responseText,
      suggestedDialAdjustments: {},
      contentRecommendations: [],
      safetyFlags: [],
    };
  }

  /**
   * Process feedback from a completed conversation (delegates to FeedbackProcessor).
   */
  async processConversationFeedback(
    conversation: Conversation,
    feedback: ConversationFeedback,
  ): Promise<void> {
    await this.feedbackProcessor.processConversationOutcome(
      conversation,
      feedback,
    );
  }

  /**
   * Process dial improvement signals (delegates to FeedbackProcessor).
   */
  async processDialImprovement(
    userId: UserId,
    dialChanges: DialChange[],
  ): Promise<void> {
    await this.feedbackProcessor.processDialImprovement(userId, dialChanges);
  }

  /**
   * Re-generate a response when the initial one failed safety checks.
   */
  private async regenerateWithGuardrails(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    failedFlags: SafetyFlag[],
  ): Promise<string> {
    const guardrailAddendum = `

CRITICAL SAFETY OVERRIDE:
Your previous response was flagged for: ${failedFlags.join(', ')}.
You MUST NOT:
- Suggest leaving a marriage (unless abuse is present)
- Use manipulation tactics or red-pill language
- Be dismissive of women
- Promote harmful relationship dynamics

Regenerate your response following Keith's coaching principles of healthy masculinity, ownership, and respect.`;

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxResponseTokens,
      system: systemPrompt + guardrailAddendum,
      messages,
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  private requireStore(): void {
    if (!this.conversationStore) {
      throw new Error(
        'ConversationStore not set. Call setConversationStore() before using CoachKeith.',
      );
    }
  }
}
