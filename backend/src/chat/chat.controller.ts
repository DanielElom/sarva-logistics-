import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LogCallDto } from './dto/log-call.dto';
import { UserRole } from '../../generated/prisma';

@ApiTags('chat')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  @Get(':orderId/messages')
  getChatHistory(
    @CurrentUser() user: any,
    @Param('orderId') orderId: string,
  ) {
    return this.chatService.getChatHistory(orderId, user.id, user.role);
  }

  @Post(':orderId/calls')
  async logCall(
    @CurrentUser() user: any,
    @Param('orderId') orderId: string,
    @Body() dto: LogCallDto,
  ) {
    const callLog = await this.chatService.logCall(
      user.id,
      orderId,
      dto.callType,
      dto.durationSeconds,
    );
    this.chatGateway.emitCallLogged(orderId, callLog);
    return callLog;
  }

  @Get(':orderId/calls')
  getCallHistory(
    @CurrentUser() user: any,
    @Param('orderId') orderId: string,
  ) {
    return this.chatService.getCallHistory(orderId, user.id, user.role);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/chat')
export class AdminChatController {
  constructor(private chatService: ChatService) {}

  @Get(':orderId/messages')
  getChatHistory(@Param('orderId') orderId: string) {
    return this.chatService.getAdminChatHistory(orderId);
  }

  @Get(':orderId/calls')
  getCallHistory(@Param('orderId') orderId: string) {
    return this.chatService.getAdminCallHistory(orderId);
  }
}
