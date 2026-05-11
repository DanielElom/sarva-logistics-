import { IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsString()
  @MinLength(8, { message: 'Confirm password must be at least 8 characters' })
  confirmPassword!: string;
}
