import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommunityService } from './community.service';

class CreatePostDto {
  @ApiProperty({
    example: 'Had a breakthrough conversation with my wife last night using the HEAR framework. She actually said she felt heard for the first time in months.',
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10, { message: 'Post must be at least 10 characters' })
  @MaxLength(2000, { message: 'Post must not exceed 2000 characters' })
  content: string;

  @ApiProperty({
    enum: ['win', 'question', 'encouragement', 'accountability', 'testimony'],
    example: 'win',
  })
  @IsEnum(['win', 'question', 'encouragement', 'accountability', 'testimony'])
  category: 'win' | 'question' | 'encouragement' | 'accountability' | 'testimony';

  @ApiProperty({ example: 'John D.', description: 'Display name in the Brotherhood feed' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  authorName: string;
}

class RequestPartnerDto {
  @ApiProperty({
    required: false,
    example: ['partner', 'power'],
    description: 'Dials you want to focus on with your partner',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  focusDials?: string[];

  @ApiProperty({ required: false, example: 'America/Chicago' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    required: false,
    enum: ['beginner', 'intermediate', 'advanced'],
    example: 'intermediate',
  })
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  @IsOptional()
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

@ApiTags('Community')
@ApiBearerAuth('access-token')
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('posts')
  @ApiOperation({
    summary: 'Get Brotherhood feed',
    description:
      'Returns paginated community posts from the Brotherhood feed. Optionally filter by category.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['win', 'question', 'encouragement', 'accountability', 'testimony'],
  })
  @ApiResponse({ status: 200, description: 'Community posts' })
  async listPosts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('category') category?: string,
  ) {
    return this.communityService.listPosts(page, limit, category);
  }

  @Post('posts')
  @ApiOperation({
    summary: 'Create a community post',
    description:
      'Posts to the Brotherhood feed. Content is AI-moderated in real time. Sensitive topics trigger resource recommendations.',
  })
  @ApiResponse({ status: 201, description: 'Post created' })
  @ApiResponse({ status: 403, description: 'Content rejected by moderation' })
  async createPost(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.communityService.createPost(userId, dto);
  }

  @Post('posts/:id/upvote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upvote a post',
    description: 'Toggle upvote on a Brotherhood post. Upvoting again removes the upvote.',
  })
  @ApiResponse({ status: 200, description: 'Upvote toggled' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async upvotePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ) {
    return this.communityService.upvotePost(userId, postId);
  }

  @Get('partnerships')
  @ApiOperation({
    summary: 'Get accountability partnerships',
    description: 'Returns all active and pending accountability partnerships for the user.',
  })
  @ApiResponse({ status: 200, description: 'Partnership data' })
  async getPartnerships(@CurrentUser('id') userId: string) {
    return this.communityService.getPartnerships(userId);
  }

  @Post('partnerships/request')
  @ApiOperation({
    summary: 'Request accountability partner match',
    description:
      'Submits a request for an accountability partner. The system matches based on shared focus dials, timezone, and experience level. If a match is found immediately, both users are notified.',
  })
  @ApiResponse({ status: 201, description: 'Match request processed' })
  @ApiResponse({ status: 400, description: 'Already has pending request' })
  async requestPartnerMatch(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestPartnerDto,
  ) {
    return this.communityService.requestPartnerMatch(userId, dto);
  }
}
