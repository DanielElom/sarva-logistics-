import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '../../../generated/prisma';

export class VerifyRiderDto {
  @IsEnum(VerificationStatus)
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
