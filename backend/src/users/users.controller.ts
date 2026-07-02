import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { BusinessAccountDto } from './dto/business-account.dto';
import { SaveAddressDto } from './dto/save-address.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { UserRole } from '../../generated/prisma';

@ApiTags('users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('me/business')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.RESTAURANT, UserRole.CORPORATE)
  upsertBusiness(@CurrentUser() user: any, @Body() dto: BusinessAccountDto) {
    return this.usersService.upsertBusinessAccount(user.id, dto);
  }

  @Get('me/addresses')
  getAddresses(@CurrentUser() user: any) {
    return this.usersService.getSavedAddresses(user.id);
  }

  @Post('me/addresses')
  addAddress(@CurrentUser() user: any, @Body() dto: SaveAddressDto) {
    return this.usersService.addSavedAddress(user.id, dto);
  }

  @Delete('me/addresses/:id')
  deleteAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.deleteSavedAddress(user.id, id);
  }

  @Get('me/orders')
  getOrders(
    @CurrentUser() user: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.usersService.getOrderHistory(
      user.id,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Patch('me/fcm-token')
  updateFcmToken(@CurrentUser() user: any, @Body() dto: UpdateFcmTokenDto) {
    return this.usersService.updateFcmToken(user.id, dto.fcmToken);
  }

  // Admin-only: update any user's status
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.usersService.updateUserStatus(id, dto.status);
  }
}
