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
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { ReassignOrderDto } from './dto/reassign-order.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { CreatePromoDto } from './dto/create-promo.dto';
import {
  OrderStatus,
  RiderType,
  UserRole,
  UserStatus,
  VerificationStatus,
} from '../../generated/prisma';

@ApiTags('admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  @Get('users')
  getUsers(
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getUsers({
      role,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Query('status') status: UserStatus) {
    return this.adminService.updateUserStatus(id, status);
  }

  // ─── Riders ───────────────────────────────────────────────────────────────

  @Get('riders')
  getRiders(
    @Query('verificationStatus') verificationStatus?: VerificationStatus,
    @Query('riderType') riderType?: string,
    @Query('isOnline') isOnline?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getRiders({
      verificationStatus,
      riderType,
      isOnline: isOnline !== undefined ? isOnline === 'true' : undefined,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get('riders/:id')
  getRiderDetail(@Param('id') id: string) {
    return this.adminService.getRiderDetail(id);
  }

  @Patch('riders/:id/verify')
  verifyRider(
    @Param('id') id: string,
    @Query('status') status: VerificationStatus,
    @Query('reason') reason?: string,
  ) {
    return this.adminService.verifyRider(id, status, reason);
  }

  @Patch('riders/:id/fleet')
  changeRiderFleet(@Param('id') id: string, @Query('type') type: RiderType) {
    return this.adminService.changeRiderFleet(id, type);
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  @Get('orders/:id')
  getOrderDetail(@Param('id') id: string) {
    return this.adminService.getOrderDetail(id);
  }

  @Patch('orders/:id/status')
  overrideOrderStatus(
    @Param('id') id: string,
    @Query('status') status: OrderStatus,
  ) {
    return this.adminService.overrideOrderStatus(id, status);
  }

  @Post('orders/:id/reassign')
  reassignOrder(@Param('id') id: string, @Body() dto: ReassignOrderDto) {
    return this.adminService.reassignOrder(id, dto.newRiderId);
  }

  // ─── Disputes ─────────────────────────────────────────────────────────────

  @Get('disputes')
  getDisputes(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getDisputes({
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get('disputes/:id')
  getDisputeDetail(@Param('id') id: string) {
    return this.adminService.getDisputeDetail(id);
  }

  @Patch('disputes/:id/resolve')
  resolveDispute(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.adminService.resolveDispute(id, dto.resolutionNotes);
  }

  // ─── Finance ──────────────────────────────────────────────────────────────

  @Get('finance/summary')
  getFinanceSummary() {
    return this.adminService.getFinanceSummary();
  }

  @Get('finance/report')
  getFinanceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getFinanceReport(startDate, endDate);
  }

  @Post('payouts/process')
  processPayout(
    @Query('riderId') riderId: string,
    @Query('amount') amount: string,
  ) {
    return this.adminService.processPayout(riderId, parseFloat(amount));
  }

  // ─── Pricing ──────────────────────────────────────────────────────────────

  @Get('pricing')
  getPricing() {
    return this.adminService.getPricing();
  }

  @Patch('pricing')
  updatePricing(@Body() dto: UpdatePricingDto) {
    return this.adminService.updatePricing(dto);
  }

  // ─── Promos ───────────────────────────────────────────────────────────────

  @Get('promos')
  getPromos() {
    return this.adminService.getPromos();
  }

  @Post('promos')
  createPromo(@Body() dto: CreatePromoDto) {
    return this.adminService.createPromo(dto);
  }

  @Patch('promos/:id')
  togglePromo(@Param('id') id: string, @Query('active') active: string) {
    return this.adminService.togglePromo(id, active === 'true');
  }
}
