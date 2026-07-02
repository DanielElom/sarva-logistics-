import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { UserRole } from '../../../generated/prisma';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[789][01]\d{8}$/, {
    message: 'phone must be a valid Nigerian number in E.164 format',
  })
  phone: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'otp must be exactly 6 digits' })
  otp: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
