/**
 * @module DevController
 * @description Development-only REST endpoints for the test suite dashboard.
 * All endpoints return 403 in production.
 */
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { DevService } from './dev.service';

function assertDev() {
  if (process.env.NODE_ENV === 'production') {
    throw new ForbiddenException('Dev endpoints are disabled in production');
  }
}

@Controller('dev')
export class DevController {
  constructor(private readonly dev: DevService) {}

  /** Creates a test account (upsert by phone). Returns user + JWT. */
  @Post('create-test-account')
  @HttpCode(200)
  async createTestAccount(
    @Body() body: { phone: string; role: string; name: string; email: string },
  ) {
    assertDev();
    return this.dev.createTestAccount(body);
  }

  /** Verifies a rider's KYC (by userId). */
  @Post('verify-rider/:userId')
  @HttpCode(200)
  async verifyRider(@Param('userId') userId: string) {
    assertDev();
    return this.dev.verifyRider(userId);
  }

  /** Approves a business account (by userId). */
  @Post('approve-business/:userId')
  @HttpCode(200)
  async approveBusiness(@Param('userId') userId: string) {
    assertDev();
    return this.dev.approveBusiness(userId);
  }

  /** Deletes all test accounts and their orders. */
  @Delete('reset-test-data')
  @HttpCode(200)
  async resetTestData() {
    assertDev();
    return this.dev.resetTestData();
  }

  /** Returns row counts for all major models. */
  @Get('db-snapshot')
  async getDbSnapshot() {
    assertDev();
    return this.dev.getDbSnapshot();
  }

  /** Returns test accounts with their verification status. */
  @Get('test-accounts')
  async getTestAccounts() {
    assertDev();
    return this.dev.getTestAccounts();
  }

  /** Returns all users pending verification. */
  @Get('pending-approvals')
  async getPendingApprovals() {
    assertDev();
    return this.dev.getPendingApprovals();
  }

  /** Updates pricing config in DB. */
  @Patch('pricing')
  @HttpCode(200)
  async updatePricing(
    @Body() body: { baseFare: number; perKmRate: number; surgeMultiplier: number },
  ) {
    assertDev();
    return this.dev.updatePricing(body.baseFare, body.perKmRate, body.surgeMultiplier);
  }

  /** Seeds GPS coordinates for a rider (by userId) — used for matching tests without real GPS. */
  @Patch('set-rider-location/:userId')
  @HttpCode(200)
  async setRiderLocation(
    @Param('userId') userId: string,
    @Body() body: { latitude: number; longitude: number },
  ) {
    assertDev();
    return this.dev.setRiderLocation(userId, body.latitude, body.longitude);
  }
}
