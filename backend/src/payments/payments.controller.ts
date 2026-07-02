import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CashConfirmDto } from './dto/cash-confirm.dto';
import { PayoutStatus, UserRole } from '../../generated/prisma';

@ApiTags('payments')
@ApiBearerAuth('JWT')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  initiatePayment(@CurrentUser() user: any, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(user.id, dto.orderId);
  }

  @Post('cash/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  confirmCash(@CurrentUser() user: any, @Body() dto: CashConfirmDto) {
    return this.paymentsService.confirmCashPayment(user.id, dto.orderId);
  }

  @Post('webhook/paystack')
  async paystackWebhook(
    @Req() req: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody: string = req.rawBody?.toString() ?? JSON.stringify(req.body);
    return this.paymentsService.handlePaystackWebhook(rawBody, signature ?? '');
  }

  @Post('webhook/opay')
  async opayWebhook(
    @Req() req: any,
    @Headers('x-opay-signature') signature: string,
  ) {
    const rawBody: string = req.rawBody?.toString() ?? JSON.stringify(req.body);
    return this.paymentsService.handleOpayWebhook(rawBody, signature ?? '');
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  getByOrder(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrder(orderId, user.id, user.role);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  getAll(
    @Query('status') status?: PayoutStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.paymentsService.getAdminPayments({
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }
}
