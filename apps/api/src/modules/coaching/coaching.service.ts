import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

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

  constructor(private readonly configService: ConfigService) {}

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
    // Build the prompt messages for the AI engine
    // In production, this integrates with @coach-keith/ai-engine and Anthropic SDK
    const anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    try {
      // TODO: Replace with actual CoachKeith AI engine integration
      // const engine = new CoachKeithEngine({ apiKey: anthropicApiKey, ruvectorPath });
      // return await engine.generateResponse({ messages, mode, fiveDialsContext });

      // Structured placeholder that demonstrates the response pattern
      const contextNote = fiveDialsContext
        ? ` Based on your Five Dials scores (${Object.entries(fiveDialsContext)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}), `
        : ' ';

      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === MessageRole.USER);
      const userContent = lastUserMessage?.content || '';

      return this.buildModeResponse(mode, userContent, contextNote);
    } catch (error) {
      this.logger.error(`AI response generation failed: ${error.message}`);
      return "I appreciate you sharing that. I'm experiencing a brief technical difficulty, but I'm here for you. Could you tell me a bit more about what's on your mind?";
    }
  }

  private buildModeResponse(
    mode: CoachingMode,
    userMessage: string,
    contextNote: string,
  ): string {
    switch (mode) {
      case CoachingMode.COACH:
        return `I hear you, brother.${contextNote}Let me ask you this — when you think about what you just shared, "${userMessage.substring(0, 60)}...", what's the deeper need underneath that? Often what we see on the surface is just the tip of the iceberg. Let's dig into the Five Dials together and find where the real growth opportunity is.`;

      case CoachingMode.MENTOR:
        return `Great question, and I've seen this pattern many times.${contextNote}Here's what I've learned through years of coaching men just like you: the key is not to fix the symptom, but to understand the system. Let me share a framework that might help you see this differently.`;

      case CoachingMode.ACCOUNTABILITY:
        return `Alright, let's get real for a second.${contextNote}You committed to making changes, and I'm here to hold you to that. What specific action did you take this week toward the goal we discussed? No sugarcoating — just the truth. That's how we grow.`;

      case CoachingMode.CRISIS:
        return `I hear the urgency in what you're sharing, and I want you to know you're not alone in this.${contextNote}First, take a breath. Now, let's focus on what you can control right now in this moment. What's the most immediate thing that needs your attention? We'll take this one step at a time.`;
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
