import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContentService } from './content.service';

@ApiTags('Content')
@ApiBearerAuth('access-token')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('podcasts')
  @ApiOperation({
    summary: 'List podcast episodes',
    description: 'Returns paginated list of podcast episodes sorted by publish date (newest first).',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated episode list' })
  async listPodcasts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.contentService.listPodcasts(page, limit);
  }

  @Get('podcasts/search')
  @ApiOperation({
    summary: 'Search podcast episodes',
    description: 'Search episodes by title, description, tags, or related Five Dials areas.',
  })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchPodcasts(@Query('q') query: string) {
    return this.contentService.searchEpisodes(query || '');
  }

  @Get('podcasts/:id')
  @ApiOperation({
    summary: 'Get episode with transcript',
    description: 'Returns full episode details including transcript and key timestamps.',
  })
  @ApiParam({ name: 'id', description: 'Episode ID' })
  @ApiResponse({ status: 200, description: 'Episode details' })
  @ApiResponse({ status: 404, description: 'Episode not found' })
  async getEpisode(@Param('id') episodeId: string) {
    return this.contentService.getEpisode(episodeId);
  }

  @Get('book/chapters')
  @ApiOperation({
    summary: 'List book chapters',
    description: 'Returns all chapters from Keith\'s book with summaries and key takeaways.',
  })
  @ApiResponse({ status: 200, description: 'Book chapters' })
  async listBookChapters() {
    return this.contentService.listBookChapters();
  }

  @Get('frameworks')
  @ApiOperation({
    summary: 'List coaching frameworks',
    description: 'Returns all available coaching frameworks with summaries.',
  })
  @ApiResponse({ status: 200, description: 'Frameworks list' })
  async listFrameworks() {
    return this.contentService.listFrameworks();
  }

  @Get('frameworks/:id')
  @ApiOperation({
    summary: 'Get framework detail',
    description: 'Returns full framework details including step-by-step instructions and related content.',
  })
  @ApiParam({ name: 'id', description: 'Framework ID or slug' })
  @ApiResponse({ status: 200, description: 'Framework details' })
  @ApiResponse({ status: 404, description: 'Framework not found' })
  async getFramework(@Param('id') frameworkId: string) {
    return this.contentService.getFramework(frameworkId);
  }

  @Get('recommended')
  @ApiOperation({
    summary: 'Get AI-recommended content',
    description: 'Returns personalized content recommendations based on the user\'s Five Dials scores and engagement history.',
  })
  @ApiResponse({ status: 200, description: 'Recommended content' })
  async getRecommended(@CurrentUser('id') userId: string) {
    // In production, fetch user's latest Five Dials scores from assessment service
    return this.contentService.getRecommendedContent(userId);
  }
}
