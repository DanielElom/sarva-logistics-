import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { CallType } from '../../../generated/prisma';

export class LogCallDto {
  @IsString()
  orderId: string;

  @IsEnum(CallType)
  callType: CallType;

  @IsInt()
  @Min(0)
  durationSeconds: number;
}
