import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

export enum CoachingMode {
  COACH = 'coach',
  MENTOR = 'mentor',
  ACCOUNTABILITY = 'accountability',
  CRISIS = 'crisis',
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  mode: CoachingMode;
  timestamp: Date;
  feedbackScore?: number;
  feedbackNote?: string;
}

interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: CoachingMode;
  messages: Message[];
  fiveDialsContext?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CoachingService {
  private readonly logger = new Logger(CoachingService.name);
  private conversations: Map<string, Conversation> = new Map();
  private anthropic: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async createConversation(
    userId: string,
    data: {
      mode?: CoachingMode;
      initialMessage?: string;
      fiveDialsContext?: Record<string, number>;
    },
  ) {
    const conversationId = uuidv4();
    const mode = data.mode || CoachingMode.COACH;

    const systemPrompt = this.buildSystemPrompt(mode, data.fiveDialsContext);
    const messages: Message[] = [
      {
        id: uuidv4(),
        role: MessageRole.SYSTEM,
        content: systemPrompt,
        mode,
        timestamp: new Date(),
      },
    ];

    // If there's an initial message, process it
    if (data.initialMessage) {
      messages.push({
        id: uuidv4(),
        role: MessageRole.USER,
        content: data.initialMessage,
        mode,
        timestamp: new Date(),
      });

      const aiResponse = await this.generateResponse(
        messages,
        mode,
        data.fiveDialsContext,
      );
      messages.push({
        id: uuidv4(),
        role: MessageRole.ASSISTANT,
        content: aiResponse,
        mode,
        timestamp: new Date(),
      });
    }

    const conversation: Conversation = {
      id: conversationId,
      userId,
      title: data.initialMessage
        ? this.generateTitle(data.initialMessage)
        : `${this.modeLabel(mode)} Session`,
      mode,
      messages,
      fiveDialsContext: data.fiveDialsContext,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(conversationId, conversation);

    this.logger.log(
      `New conversation created: ${conversationId} for user ${userId} in ${mode} mode`,
    );

    return this.sanitizeConversation(conversation);
  }

  async listConversations(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const userConversations = Array.from(this.conversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const total = userConversations.length;
    const offset = (page - 1) * limit;
    const items = userConversations.slice(offset, offset + limit).map((c) => ({
      id: c.id,
      title: c.title,
      mode: c.mode,
      messageCount: c.messages.filter((m) => m.role !== MessageRole.SYSTEM)
        .length,
      lastMessageAt: c.updatedAt,
      createdAt: c.createdAt,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.sanitizeConversation(conversation);
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
  ) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: MessageRole.USER,
      content,
      mode: conversation.mode,
      timestamp: new Date(),
    };
    conversation.messages.push(userMessage);

    // Generate AI response using the conversation context
    const aiResponseContent = await this.generateResponse(
      conversation.messages,
      conversation.mode,
      conversation.fiveDialsContext,
    );

    const assistantMessage: Message = {
      id: uuidv4(),
      role: MessageRole.ASSISTANT,
      content: aiResponseContent,
      mode: conversation.mode,
      timestamp: new Date(),
    };
    conversation.messages.push(assistantMessage);
    conversation.updatedAt = new Date();

    // Update title if this is the first real exchange
    const userMessages = conversation.messages.filter(
      (m) => m.role === MessageRole.USER,
    );
    if (userMessages.length === 1) {
      conversation.title = this.generateTitle(content);
    }

    this.logger.log(
      `Message processed in conversation ${conversationId}: ${content.substring(0, 50)}...`,
    );

    return {
      userMessage: {
        id: userMessage.id,
        content: userMessage.content,
        timestamp: userMessage.timestamp,
      },
      assistantMessage: {
        id: assistantMessage.id,
        content: assistantMessage.content,
        mode: assistantMessage.mode,
        timestamp: assistantMessage.timestamp,
      },
    };
  }

  async switchMode(
    userId: string,
    conversationId: string,
    newMode: CoachingMode,
  ) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const previousMode = conversation.mode;
    conversation.mode = newMode;
    conversation.updatedAt = new Date();

    // Insert a system message noting the mode change
    const modeChangeMessage: Message = {
      id: uuidv4(),
      role: MessageRole.SYSTEM,
      content: this.buildSystemPrompt(newMode, conversation.fiveDialsContext),
      mode: newMode,
      timestamp: new Date(),
    };
    conversation.messages.push(modeChangeMessage);

    this.logger.log(
      `Mode switched from ${previousMode} to ${newMode} in conversation ${conversationId}`,
    );

    return {
      conversationId,
      previousMode,
      newMode,
      message: `Switched from ${this.modeLabel(previousMode)} to ${this.modeLabel(newMode)} mode`,
    };
  }

  async submitFeedback(
    userId: string,
    conversationId: string,
    data: { messageId: string; score: number; note?: string },
  ) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const message = conversation.messages.find((m) => m.id === data.messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.role !== MessageRole.ASSISTANT) {
      throw new ForbiddenException('Can only provide feedback on AI responses');
    }

    message.feedbackScore = data.score;
    message.feedbackNote = data.note;

    // Feed learning signal to SONA/Ruvector
    await this.recordLearningSignal({
      conversationId,
      messageId: data.messageId,
      mode: message.mode,
      score: data.score,
      note: data.note,
      responseContent: message.content,
      userId,
    });

    this.logger.log(
      `Feedback recorded for message ${data.messageId}: score=${data.score}`,
    );

    return {
      messageId: data.messageId,
      score: data.score,
      acknowledged: true,
    };
  }

  private async generateResponse(
    messages: Message[],
    mode: CoachingMode,
    fiveDialsContext?: Record<string, number>,
  ): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(mode, fiveDialsContext);
      const apiMessages = messages
        .filter((m) => m.role !== MessageRole.SYSTEM)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: apiMessages,
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock?.text || "I'm here for you, brother. Tell me more about what's going on.";
    } catch (error) {
      this.logger.error(`AI response generation failed: ${error.message}`);
      return "I appreciate you sharing that. I'm experiencing a brief technical difficulty, but I'm here for you. Could you tell me a bit more about what's on your mind?";
    }
  }

  /**
   * Stream a chat message via SSE. Creates or continues a conversation.
   */
  async *streamChat(
    userId: string,
    data: { conversationId?: string; message: string; mode?: string },
  ): AsyncGenerator<string> {
    const mode = (data.mode as CoachingMode) || CoachingMode.COACH;

    // Get or create conversation
    let conversation: Conversation;
    if (data.conversationId && this.conversations.has(data.conversationId)) {
      conversation = this.conversations.get(data.conversationId)!;
      if (conversation.userId !== userId) {
        throw new ForbiddenException('Access denied');
      }
    } else {
      const conversationId = uuidv4();
      conversation = {
        id: conversationId,
        userId,
        title: this.generateTitle(data.message),
        mode,
        messages: [
          {
            id: uuidv4(),
            role: MessageRole.SYSTEM,
            content: this.buildSystemPrompt(mode),
            mode,
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.conversations.set(conversationId, conversation);
    }

    // Add user message
    conversation.messages.push({
      id: uuidv4(),
      role: MessageRole.USER,
      content: data.message,
      mode: conversation.mode,
      timestamp: new Date(),
    });

    try {
      const systemPrompt = this.buildSystemPrompt(
        conversation.mode,
        conversation.fiveDialsContext,
      );
      const apiMessages = conversation.messages
        .filter((m) => m.role !== MessageRole.SYSTEM)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const stream = this.anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: apiMessages,
      });

      let fullContent = '';

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          fullContent += event.delta.text;
          yield event.delta.text;
        }
      }

      // Store assistant message
      conversation.messages.push({
        id: uuidv4(),
        role: MessageRole.ASSISTANT,
        content: fullContent,
        mode: conversation.mode,
        timestamp: new Date(),
      });
      conversation.updatedAt = new Date();

      // Yield conversation metadata at the end
      yield `\n[CONV_ID:${conversation.id}]`;
    } catch (error) {
      this.logger.error(`Streaming chat failed: ${error.message}`);
      yield "I appreciate you sharing that. I'm experiencing a brief technical difficulty, but I'm here for you.";
    }
  }

  private buildSystemPrompt(
    mode: CoachingMode,
    fiveDialsContext?: Record<string, number>,
  ): string {
    const basePrompt = `You are Coach Keith — a direct, empathetic, and no-BS coach for men. You speak from decades of experience helping men become better husbands and fathers. Your framework centers on the Five Dials: Parent, Partner, Producer, Player, and Power. You are warm but challenging, never enabling, and always pushing men toward growth and accountability.`;

    const contextPrompt = fiveDialsContext
      ? `\n\nThe user's current Five Dials scores: ${JSON.stringify(fiveDialsContext)}. Use these scores to personalize your coaching.`
      : '';

    const modePrompts: Record<CoachingMode, string> = {
      [CoachingMode.COACH]: `\n\nYou are in COACHING mode. Ask probing questions, help the user identify patterns, and guide them to their own insights. Use the Socratic method. Focus on awareness and understanding.`,
      [CoachingMode.MENTOR]: `\n\nYou are in MENTORING mode. Share wisdom, frameworks, and stories from your coaching experience. Be more directive and offer specific advice and strategies. Draw from Keith's book and podcast content.`,
      [CoachingMode.ACCOUNTABILITY]: `\n\nYou are in ACCOUNTABILITY mode. Be direct and firm. Check on commitments, challenge excuses, and push for specific, measurable actions. Don't let the user off the hook. Track progress against goals.`,
      [CoachingMode.CRISIS]: `\n\nYou are in CRISIS mode. The user is dealing with an urgent situation. Be compassionate but grounded. Help stabilize emotions first, then move to practical next steps. If the situation involves danger, recommend professional resources.`,
    };

    return basePrompt + contextPrompt + modePrompts[mode];
  }

  private async recordLearningSignal(signal: {
    conversationId: string;
    messageId: string;
    mode: CoachingMode;
    score: number;
    note?: string;
    responseContent: string;
    userId: string;
  }) {
    // In production, this feeds into the SONA adaptive learning system via Ruvector
    // const ruvectorPath = this.configService.get<string>('RUVECTOR_PATH');
    // await ruvectorClient.recordFeedback({
    //   vector: await ruvectorClient.embed(signal.responseContent),
    //   score: signal.score,
    //   metadata: { mode: signal.mode, userId: signal.userId },
    // });
    this.logger.log(
      `Learning signal recorded: conversation=${signal.conversationId}, score=${signal.score}, mode=${signal.mode}`,
    );
  }

  private generateTitle(message: string): string {
    // Generate a short title from the first message
    const cleaned = message.replace(/[^\w\s]/g, '').trim();
    const words = cleaned.split(/\s+/).slice(0, 6);
    return words.join(' ') + (cleaned.split(/\s+/).length > 6 ? '...' : '');
  }

  private modeLabel(mode: CoachingMode): string {
    const labels: Record<CoachingMode, string> = {
      [CoachingMode.COACH]: 'Coaching',
      [CoachingMode.MENTOR]: 'Mentoring',
      [CoachingMode.ACCOUNTABILITY]: 'Accountability',
      [CoachingMode.CRISIS]: 'Crisis Support',
    };
    return labels[mode];
  }

  private sanitizeConversation(conversation: Conversation) {
    return {
      id: conversation.id,
      title: conversation.title,
      mode: conversation.mode,
      messages: conversation.messages
        .filter((m) => m.role !== MessageRole.SYSTEM)
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          mode: m.mode,
          timestamp: m.timestamp,
          feedbackScore: m.feedbackScore,
        })),
      fiveDialsContext: conversation.fiveDialsContext,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}
