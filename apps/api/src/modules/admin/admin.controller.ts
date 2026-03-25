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
import { Admin } from './admin.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Admin()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get admin dashboard overview',
    description:
      'Returns high-level metrics: total users, total conversations, average leading score, users at risk, active subscriptions.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard overview metrics' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getOverview() {
    return this.adminService.getOverview();
  }

  @Get('clients')
  @ApiOperation({
    summary: 'List all clients with grades and scores',
    description:
      'Returns paginated list of all users with grade (A-F), belt level, leading/lagging scores, streak, and last active date.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated client list' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getClients(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.adminService.getClients(page, limit);
  }

  @Get('clients/:id')
  @ApiOperation({
    summary: 'Get full client detail',
    description:
      'Returns complete client profile including assessment history, conversations, scores, grade breakdown, and recent interventions.',
  })
  @ApiParam({ name: 'id', description: 'Client user ID' })
  @ApiResponse({ status: 200, description: 'Full client detail' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async getClientDetail(@Param('id') clientId: string) {
    return this.adminService.getClientDetail(clientId);
  }
}
