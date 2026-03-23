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
import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AssessmentService } from './assessment.service';

class SubmitFiveDialsDto {
  @ApiProperty({
    description:
      'Assessment responses keyed by dial_questionIndex (e.g., self_0, marriage_2). Values 1-10.',
    example: {
      self_0: 7,
      self_1: 6,
      self_2: 8,
      self_3: 5,
      self_4: 7,
      marriage_0: 4,
      marriage_1: 5,
      marriage_2: 3,
      marriage_3: 6,
      marriage_4: 5,
    },
  })
  @IsObject()
  @IsNotEmpty()
  responses: Record<string, number>;
}

@ApiTags('Assessment')
@ApiBearerAuth('access-token')
@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post('five-dials')
  @ApiOperation({
    summary: 'Submit Five Dials assessment',
    description:
      'Submit responses to the Five Dials assessment (Self, Marriage, Family, Faith, Finances). Each response is scored 1-10. Returns computed scores, health score, insights, and trends.',
  })
  @ApiResponse({ status: 201, description: 'Assessment submitted and scored' })
  @ApiResponse({ status: 400, description: 'Invalid response data' })
  async submitFiveDials(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitFiveDialsDto,
  ) {
    return this.assessmentService.submitFiveDials(userId, dto);
  }

  @Get('five-dials/history')
  @ApiOperation({
    summary: 'Get assessment history',
    description: 'Returns paginated list of past Five Dials assessments with scores and health score.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Assessment history' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.assessmentService.getAssessmentHistory(userId, page, limit);
  }

  @Get('five-dials/current')
  @ApiOperation({
    summary: 'Get latest Five Dials scores',
    description: 'Returns the most recent assessment scores, insights, and trend data.',
  })
  @ApiResponse({ status: 200, description: 'Current scores and trends' })
  async getCurrentScores(@CurrentUser('id') userId: string) {
    return this.assessmentService.getCurrentScores(userId);
  }

  @Get('health-score')
  @ApiOperation({
    summary: 'Get Marriage Health Score',
    description:
      'Returns the weighted health score (0-100) with category (thriving/growing/struggling/crisis), trends, and recommendations.',
  })
  @ApiResponse({ status: 200, description: 'Health score data' })
  @ApiResponse({ status: 404, description: 'No assessments found' })
  async getHealthScore(@CurrentUser('id') userId: string) {
    return this.assessmentService.getHealthScore(userId);
  }

  @Get('challenges')
  @ApiOperation({
    summary: 'Get active micro-challenges',
    description:
      'Returns currently active micro-challenges generated from the user\'s lowest-scoring Five Dials areas.',
  })
  @ApiResponse({ status: 200, description: 'Active challenges' })
  async getChallenges(@CurrentUser('id') userId: string) {
    return this.assessmentService.getActiveChallenges(userId);
  }

  @Post('challenges/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete a micro-challenge',
    description: 'Marks a challenge as completed and awards points. Challenges must not be expired.',
  })
  @ApiResponse({ status: 200, description: 'Challenge completed' })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  @ApiResponse({ status: 400, description: 'Challenge already completed or expired' })
  async completeChallenge(
    @CurrentUser('id') userId: string,
    @Param('id') challengeId: string,
  ) {
    return this.assessmentService.completeChallenge(userId, challengeId);
  }
}
