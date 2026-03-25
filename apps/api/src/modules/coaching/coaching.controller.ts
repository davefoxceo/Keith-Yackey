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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
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
import { AccountabilityService } from './accountability.service';
import { ChallengeService } from './challenge.service';

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
  private static readonly ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
  ];
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(
    private readonly coachingService: CoachingService,
    private readonly accountabilityService: AccountabilityService,
    private readonly challengeService: ChallengeService,
  ) {}

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
    // CORS headers must be set manually when using @Res() as it bypasses NestJS middleware
    const origin = (res.req?.headers?.origin as string) || 'http://localhost:3002';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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

  @Post('chat-with-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: undefined, // memoryStorage is the default
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Stream a chat message with an image attachment',
    description:
      'Sends a message with a screenshot or image and streams the AI response via SSE. Accepts multipart form data with image (max 5MB, png/jpg/webp), message, and optional conversationId/mode.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary', description: 'Image file (png, jpg, webp, max 5MB)' },
        message: { type: 'string', description: 'Chat message text' },
        conversationId: { type: 'string', description: 'Optional conversation ID to continue' },
        mode: { type: 'string', description: 'Coaching mode (coach, mentor, accountability, crisis)' },
      },
      required: ['image', 'message'],
    },
  })
  @ApiResponse({ status: 200, description: 'SSE stream of AI response chunks' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async streamChatWithImage(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { message: string; conversationId?: string; mode?: string },
    @Res() res: Response,
  ) {
    // Validate file presence
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    // Validate mime type
    if (!CoachingController.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: png, jpg, webp`,
      );
    }

    // Validate file size (belt-and-suspenders with multer limit)
    if (file.size > CoachingController.MAX_FILE_SIZE) {
      throw new BadRequestException('Image must be under 5MB');
    }

    // Validate message
    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      throw new BadRequestException('Message text is required');
    }

    // CORS + SSE headers (same pattern as /chat)
    const origin = (res.req?.headers?.origin as string) || 'http://localhost:3002';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const chunk of this.coachingService.streamChatWithImage(
        userId,
        body.message,
        file.buffer,
        file.mimetype,
        body.conversationId,
        body.mode,
      )) {
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

  @Get('daily-actions')
  @ApiOperation({
    summary: 'Get today\'s daily actions',
    description:
      'Returns 3 AI-generated daily micro-actions based on the user\'s Five Dials scores, recent conversations, and streak. Generates new actions if not yet generated today.',
  })
  @ApiResponse({ status: 200, description: 'Today\'s daily actions' })
  async getDailyActions(@CurrentUser('id') userId: string) {
    return this.challengeService.getUserChallenges(userId).then((r) => ({
      actions: r.dailyActions,
      completedCount: r.dailyCompletedCount,
      date: r.date,
    }));
  }

  @Get('weekly-challenge')
  @ApiOperation({
    summary: 'Get current weekly challenge',
    description:
      'Returns the AI-generated weekly challenge focused on the user\'s lowest-scoring dial. Generates a new challenge if one does not exist for the current week.',
  })
  @ApiResponse({ status: 200, description: 'Current weekly challenge' })
  async getWeeklyChallenge(@CurrentUser('id') userId: string) {
    return this.challengeService.getUserChallenges(userId).then((r) => ({
      challenge: r.weeklyChallenge,
      week: r.week,
    }));
  }

  @Post('daily-actions/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a daily action as complete',
    description: 'Marks a specific daily action as completed and returns the updated completion count.',
  })
  @ApiParam({ name: 'id', description: 'Action ID' })
  @ApiResponse({ status: 200, description: 'Action marked complete' })
  @ApiResponse({ status: 404, description: 'Action not found' })
  async completeDailyAction(
    @CurrentUser('id') userId: string,
    @Param('id') actionId: string,
  ) {
    return this.challengeService.completeAction(userId, actionId);
  }

  @Post('weekly-challenge/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark weekly challenge as complete',
    description: 'Marks the current weekly challenge as completed.',
  })
  @ApiResponse({ status: 200, description: 'Weekly challenge marked complete' })
  @ApiResponse({ status: 404, description: 'No weekly challenge found' })
  async completeWeeklyChallenge(@CurrentUser('id') userId: string) {
    return this.challengeService.completeWeeklyChallenge(userId);
  }

  @Get('interventions')
  @ApiOperation({
    summary: 'Get pending accountability interventions',
    description:
      'Returns undelivered accountability messages from Coach Keith (warnings, celebrations, escalations). Messages are marked as delivered after being returned.',
  })
  @ApiResponse({ status: 200, description: 'List of pending interventions' })
  async getInterventions(@CurrentUser('id') userId: string) {
    const interventions =
      this.accountabilityService.getUndeliveredMessages(userId);

    // Mark all as delivered after returning
    for (const intervention of interventions) {
      this.accountabilityService.markDelivered(userId, intervention.id);
    }

    return { interventions };
  }
}
