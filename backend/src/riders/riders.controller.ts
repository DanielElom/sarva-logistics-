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
import { RidersService } from './riders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateRiderDto } from './dto/update-rider.dto';
import { KycDto } from './dto/kyc.dto';
import { VerifyRiderDto } from './dto/verify-rider.dto';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { UserRole } from '../../generated/prisma';

@ApiTags('riders')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('riders')
export class RidersController {
  constructor(private ridersService: RidersService) {}

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  getMe(@CurrentUser() user: any) {
    return this.ridersService.getRiderProfile(user.id);
  }

  @Patch('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateRiderDto) {
    return this.ridersService.updateRiderProfile(user.id, dto);
  }

  @Post('me/kyc')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  submitKyc(@CurrentUser() user: any, @Body() dto: KycDto) {
    return this.ridersService.submitKyc(user.id, dto);
  }

  @Patch('me/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  toggleStatus(@CurrentUser() user: any, @Body() dto: ToggleStatusDto) {
    return this.ridersService.toggleOnlineStatus(user.id, dto.isOnline);
  }

  @Get('me/earnings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  getEarnings(@CurrentUser() user: any) {
    return this.ridersService.getEarnings(user.id);
  }

  // Admin-only routes
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listRiders(
    @Query('verified') verified?: string,
    @Query('online') online?: string,
    @Query('fleetType') fleetType?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.ridersService.listRiders({
      verified: verified !== undefined ? verified === 'true' : undefined,
      online: online !== undefined ? online === 'true' : undefined,
      fleetType,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Patch(':id/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  verifyRider(@Param('id') id: string, @Body() dto: VerifyRiderDto) {
    return this.ridersService.verifyRider(id, dto);
  }
}
