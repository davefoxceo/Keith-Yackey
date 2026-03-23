import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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
  IsOptional,
  IsObject,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';

class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'John' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ required: false, example: 'Doe' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false, example: 'married' })
  @IsString()
  @IsOptional()
  relationshipStatus?: string;

  @ApiProperty({ required: false, example: 'Sarah' })
  @IsString()
  @IsOptional()
  partnerName?: string;

  @ApiProperty({ required: false, example: 2 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(20)
  @Type(() => Number)
  childrenCount?: number;

  @ApiProperty({ required: false, example: 'America/Chicago' })
  @IsString()
  @IsOptional()
  timezone?: string;
}

class OnboardingDto {
  @ApiProperty({ example: 'Improve communication with my wife' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  primaryGoal: string;

  @ApiProperty({ example: 'I shut down during arguments and withdraw' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  biggestChallenge: string;

  @ApiProperty({ required: false, example: '8 years' })
  @IsString()
  @IsOptional()
  relationshipDuration?: string;

  @ApiProperty({
    example: 'none',
    description: 'none, some, or significant',
  })
  @IsString()
  coachingExperience: string;

  @ApiProperty({ minimum: 1, maximum: 10, example: 8 })
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  commitmentLevel: number;

  @ApiProperty({
    example: { self: 6, marriage: 4, family: 7, faith: 5, finances: 3 },
    description: 'Quick initial Five Dials self-assessment (1-10 per dial)',
  })
  @IsObject()
  initialFiveDialsScores: Record<string, number>;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ required: false, example: 'Sarah' })
  @IsString()
  @IsOptional()
  partnerName?: string;

  @ApiProperty({ required: false, example: 2 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(20)
  @Type(() => Number)
  childrenCount?: number;

  @ApiProperty({ required: false, example: 'America/Chicago' })
  @IsString()
  @IsOptional()
  timezone?: string;
}

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Returns the authenticated user\'s profile including onboarding status and membership duration.',
  })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Updates profile fields. Only provided fields are updated.',
  })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, dto);
  }

  @Post('onboarding')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Complete onboarding assessment',
    description:
      'Submits the onboarding questionnaire including goals, challenges, commitment level, and initial Five Dials scores. Returns personalized welcome message and next steps.',
  })
  @ApiResponse({ status: 201, description: 'Onboarding completed' })
  async completeOnboarding(
    @CurrentUser('id') userId: string,
    @Body() dto: OnboardingDto,
  ) {
    return this.userService.completeOnboarding(userId, dto);
  }

  @Get('journey')
  @ApiOperation({
    summary: 'Get journey map data',
    description:
      'Returns the user\'s journey map showing their progression through the five stages: Awakening, Foundation, Growth, Transformation, and Leadership.',
  })
  @ApiResponse({ status: 200, description: 'Journey map data' })
  async getJourneyMap(@CurrentUser('id') userId: string) {
    return this.userService.getJourneyMap(userId);
  }

  @Delete('data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request data deletion',
    description:
      'Initiates GDPR/CCPA-compliant data deletion. All personal data will be permanently deleted within 30 days. The request can be cancelled by contacting support.',
  })
  @ApiResponse({ status: 200, description: 'Deletion request acknowledged' })
  async requestDataDeletion(@CurrentUser('id') userId: string) {
    return this.userService.requestDataDeletion(userId);
  }
}
