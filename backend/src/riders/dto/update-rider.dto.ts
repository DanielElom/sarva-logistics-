import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CommissionModel, RiderType } from '../../../generated/prisma';

export class UpdateRiderDto {
  @IsOptional()
  @IsEnum(CommissionModel)
  commissionModel?: CommissionModel;

  @IsOptional()
  @IsEnum(RiderType)
  fleetType?: RiderType;

  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bikeMakeModel?: string;
}
