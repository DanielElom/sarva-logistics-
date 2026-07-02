import { IsEnum } from 'class-validator';
import { UserStatus } from '../../../generated/prisma';

export class UpdateStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}
