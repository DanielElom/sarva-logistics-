import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[789][01]\d{8}$/, {
    message: 'phone must be a valid Nigerian number in E.164 format',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  otp!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
