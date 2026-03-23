import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EngagementService } from './engagement.service';

class SubmitReflectionDto {
  @ApiProperty({ example: 'My wife surprised me with my favorite meal' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  gratitude: string;

  @ApiProperty({ example: 'Had a meaningful conversation with my son about school' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  winOfTheDay: string;

  @ApiProperty({ example: 'Got defensive when my wife brought up the budget' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  challengeFaced: string;

  @ApiProperty({ example: 'Apologize and revisit the budget conversation calmly' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  tomorrowIntention: string;

  @ApiProperty({ minimum: 1, maximum: 10, example: 7 })
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  moodScore: number;
}

@ApiTags('Engagement')
@ApiBearerAuth('access-token')
@Controller('engagement')
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Get('streak')
  @ApiOperation({
    summary: 'Get current streak data',
    description:
      'Returns the user\'s current streak count, longest streak, total active days, and progress toward the next milestone.',
  })
  @ApiResponse({ status: 200, description: 'Streak data' })
  async getStreak(@CurrentUser('id') userId: string) {
    return this.engagementService.getStreak(userId);
  }

  @Post('kickstart/opened')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record morning kickstart opened',
    description:
      'Records that the user opened their morning kickstart prompt. Contributes to daily streak.',
  })
  @ApiResponse({ status: 200, description: 'Kickstart recorded' })
  async recordKickstartOpened(@CurrentUser('id') userId: string) {
    return this.engagementService.recordKickstartOpened(userId);
  }

  @Get('kickstart/today')
  @ApiOperation({
    summary: "Get today's morning kickstart prompt",
    description:
      'Returns a personalized daily prompt to start the day with intentionality. Varies daily per user.',
  })
  @ApiResponse({ status: 200, description: "Today's prompt" })
  async getTodayPrompt(@CurrentUser('id') userId: string) {
    return this.engagementService.getTodayPrompt(userId);
  }

  @Post('reflection')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit evening reflection',
    description:
      'Submit a nightly reflection covering gratitude, wins, challenges, and tomorrow\'s intention. Includes a mood score (1-10). Contributes to streak and may unlock milestones.',
  })
  @ApiResponse({ status: 201, description: 'Reflection submitted' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async submitReflection(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitReflectionDto,
  ) {
    return this.engagementService.submitReflection(userId, dto);
  }

  @Get('milestones')
  @ApiOperation({
    summary: 'Get earned milestones',
    description:
      'Returns all milestones the user has earned, plus the next upcoming milestones with progress.',
  })
  @ApiResponse({ status: 200, description: 'Milestones data' })
  async getMilestones(@CurrentUser('id') userId: string) {
    return this.engagementService.getMilestones(userId);
  }
}
