import {
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JobResponseDto } from './dto/job-response.dto';
import { UserRole } from '../../generated/prisma';

@ApiTags('matching')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RIDER)
@Controller('matching')
export class MatchingController {
  constructor(
    private matchingService: MatchingService,
    private prisma: PrismaService,
  ) {}

  private async getRiderProfileId(userId: string): Promise<string> {
    const profile = await (this.prisma as any).riderProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Rider profile not found');
    return profile.id;
  }

  @Post('accept')
  async accept(@CurrentUser() user: any, @Body() dto: JobResponseDto) {
    const riderId = await this.getRiderProfileId(user.id);
    return this.matchingService.riderAccepted(dto.orderId, riderId);
  }

  @Post('reject')
  async reject(@CurrentUser() user: any, @Body() dto: JobResponseDto) {
    const riderId = await this.getRiderProfileId(user.id);
    return this.matchingService.riderRejected(dto.orderId, riderId);
  }
}
