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
import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';

class VerifyReceiptDto {
  @ApiProperty({ description: 'App store receipt data (base64 encoded)' })
  @IsString()
  receipt: string;

  @ApiProperty({ enum: ['ios', 'android'], example: 'ios' })
  @IsEnum(['ios', 'android'])
  platform: 'ios' | 'android';

  @ApiProperty({
    example: 'com.coachkeith.pro.monthly',
    description: 'Product ID from app store',
  })
  @IsString()
  productId: string;
}

@ApiTags('Subscription')
@ApiBearerAuth('access-token')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current subscription',
    description:
      'Returns the user\'s current subscription tier, status, period dates, and available upgrade options.',
  })
  @ApiResponse({ status: 200, description: 'Subscription data' })
  async getSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionService.getSubscription(userId);
  }

  @Post('verify-receipt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify app store receipt',
    description:
      'Verifies an iOS App Store or Google Play receipt and activates or updates the subscription. Returns the new entitlements.',
  })
  @ApiResponse({ status: 200, description: 'Receipt verified, subscription activated' })
  @ApiResponse({ status: 400, description: 'Invalid receipt or product ID' })
  async verifyReceipt(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyReceiptDto,
  ) {
    return this.subscriptionService.verifyReceipt(userId, dto);
  }

  @Get('entitlements')
  @ApiOperation({
    summary: 'Get feature entitlements',
    description:
      'Returns all feature entitlements for the user\'s current subscription tier. Each feature includes whether it is enabled and any usage limits.',
  })
  @ApiResponse({ status: 200, description: 'Entitlement list' })
  async getEntitlements(@CurrentUser('id') userId: string) {
    return this.subscriptionService.getEntitlements(userId);
  }
}
