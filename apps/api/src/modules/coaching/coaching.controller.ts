import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CoachingService, CoachingMode } from './coaching.service';

class CreateConversationDto {
  @ApiProperty({ enum: CoachingMode, required: false, default: CoachingMode.COACH })
  @IsEnum(CoachingMode)
  @IsOptional()
  mode?: CoachingMode;

  @ApiProperty({ required: false, example: "I've been struggling with communication in my marriage" })
  @IsString()
  @IsOptional()
  initialMessage?: string;

  @ApiProperty({
    required: false,
    example: { self: 7, marriage: 5, family: 6, faith: 8, finances: 4 },
    description: 'Current Five Dials scores for context',
  })
  @IsObject()
  @IsOptional()
  fiveDialsContext?: Record<string, number>;
}

class SendMessageDto {
  @ApiProperty({ example: "I tried having that conversation but it didn't go well" })
  @IsString()
  content: string;
}

class SwitchModeDto {
  @ApiProperty({ enum: CoachingMode, example: CoachingMode.ACCOUNTABILITY })
  @IsEnum(CoachingMode)
  mode: CoachingMode;
}

class StreamChatDto {
  @ApiProperty({ example: "I've been struggling with communication in my marriage" })
  @IsString()
  message: string;

  @ApiProperty({ required: false, description: 'Existing conversation ID to continue' })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ required: false, description: 'Coaching mode', example: 'coach' })
  @IsString()
  @IsOptional()
  mode?: string;
}

class SubmitFeedbackDto {
  @ApiProperty({ description: 'The AI message ID to provide feedback on' })
  @IsString()
  messageId: string;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Feedback score (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  score: number;

  @ApiProperty({ required: false, description: 'Optional feedback note' })
  @IsString()
  @IsOptional()
  note?: string;
}

@ApiTags('Coaching')
@ApiBearerAuth('access-token')
@Controller('coaching')
export class CoachingController {
  constructor(private readonly coachingService: CoachingService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Stream a chat message with Coach Keith',
    description:
      'Sends a message and streams the AI response via Server-Sent Events. Creates a new conversation if no conversationId is provided.',
  })
  @ApiResponse({ status: 200, description: 'SSE stream of AI response chunks' })
  async streamChat(
    @CurrentUser('id') userId: string,
    @Body() dto: StreamChatDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const chunk of this.coachingService.streamChat(userId, dto)) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({ text: "I'm having a moment — let me try again. What were you saying?" })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
    }

    res.end();
  }

  @Post('conversations')
  @ApiOperation({
    summary: 'Start a new coaching conversation',
    description:
      'Creates a new conversation with Coach Keith. Optionally specify a coaching mode and initial message. Five Dials context personalizes the AI responses.',
  })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.coachingService.createConversation(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'List user conversations',
    description: 'Returns paginated list of conversations for the authenticated user, sorted by most recent.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated conversation list' })
  async listConversations(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.coachingService.listConversations(userId, page, limit);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation with messages',
    description: 'Returns the full conversation including all messages. System messages are filtered out.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation with messages' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.coachingService.getConversation(userId, conversationId);
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a message and get AI response',
    description:
      'Sends a user message to Coach Keith and returns the AI response. The response adapts based on the current coaching mode and Five Dials context.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'User message and AI response' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.coachingService.sendMessage(userId, conversationId, dto.content);
  }

  @Patch('conversations/:id/mode')
  @ApiOperation({
    summary: 'Switch coaching mode',
    description:
      'Changes the coaching mode mid-conversation. Modes: coach (Socratic), mentor (directive), accountability (firm), crisis (compassionate).',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Mode switched' })
  async switchMode(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: SwitchModeDto,
  ) {
    return this.coachingService.switchMode(userId, conversationId, dto.mode);
  }

  @Post('conversations/:id/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit feedback on AI response',
    description:
      'Provides feedback (1-5 score) on an AI message. This feeds into the SONA adaptive learning system to improve future responses.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Feedback recorded' })
  @ApiResponse({ status: 404, description: 'Conversation or message not found' })
  async submitFeedback(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.coachingService.submitFeedback(userId, conversationId, dto);
  }
}
