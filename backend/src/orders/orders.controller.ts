import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderStatus, UserRole } from '../../generated/prisma/enums';

@ApiTags('orders')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.INDIVIDUAL,
    UserRole.VENDOR,
    UserRole.RESTAURANT,
    UserRole.CORPORATE,
  )
  createOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  getOrders(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('status') status?: string,
  ) {
    return this.ordersService.getOrders(
      user.id,
      parseInt(page, 10),
      parseInt(limit, 10),
      status,
    );
  }

  @Get(':id')
  getOrderById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, user.id, user.role);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.INDIVIDUAL,
    UserRole.VENDOR,
    UserRole.RESTAURANT,
    UserRole.CORPORATE,
  )
  cancelOrder(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(user.id, id, dto.reason);
  }

  @Post(':id/confirm-delivery')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.INDIVIDUAL,
    UserRole.VENDOR,
    UserRole.RESTAURANT,
    UserRole.CORPORATE,
  )
  confirmDelivery(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.confirmDelivery(user.id, id);
  }

  @Post(':id/rate')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.INDIVIDUAL,
    UserRole.VENDOR,
    UserRole.RESTAURANT,
    UserRole.CORPORATE,
  )
  rateRider(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { stars: number; comment?: string },
  ) {
    return this.ordersService.rateRider(user.id, id, dto);
  }

  @Post(':id/dispute')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.INDIVIDUAL,
    UserRole.VENDOR,
    UserRole.RESTAURANT,
    UserRole.CORPORATE,
  )
  raiseDispute(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { issueType: string; description: string },
  ) {
    return this.ordersService.raiseDispute(user.id, id, dto);
  }
}

// ── Public endpoints (no auth) ──────────────────────────────────────────
@ApiTags('orders')
@Controller('orders')
export class PublicOrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get('price-estimate')
  priceEstimate(
    @Query('pickupLat') pickupLat: string,
    @Query('pickupLng') pickupLng: string,
    @Query('dropoffLat') dropoffLat: string,
    @Query('dropoffLng') dropoffLng: string,
  ) {
    return this.ordersService.getPriceEstimate(
      parseFloat(pickupLat ?? '0'),
      parseFloat(pickupLng ?? '0'),
      parseFloat(dropoffLat ?? '0'),
      parseFloat(dropoffLng ?? '0'),
    );
  }

  @Get('places/autocomplete')
  placesAutocomplete(@Query('input') input = '') {
    return this.ordersService.getPlacesAutocomplete(input);
  }

  @Post('ai-address')
  aiAddress(@Body() body: { description: string }) {
    return this.ordersService.parseAiAddress(body.description ?? '');
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  getAdminOrders(
    @Query('status') status?: OrderStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.ordersService.getAdminOrders({
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }
}
