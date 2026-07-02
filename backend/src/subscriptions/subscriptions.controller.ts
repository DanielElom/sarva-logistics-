import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionStatus, UserRole } from '../../generated/prisma';

@ApiTags('subscriptions')
@ApiBearerAuth('JWT')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@CurrentUser() user: any, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.subscribe(user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMySubscription(@CurrentUser() user: any) {
    return this.subscriptionsService.getActiveSubscription(user.id);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: any) {
    return this.subscriptionsService.cancelSubscription(user.id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get()
  getAll(
    @Query('status') status?: SubscriptionStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.subscriptionsService.getAdminSubscriptions({
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Patch(':id')
  updateStatus(
    @Param('id') id: string,
    @Query('status') status: SubscriptionStatus,
  ) {
    return this.subscriptionsService.adminUpdateSubscription(id, status);
  }
}
