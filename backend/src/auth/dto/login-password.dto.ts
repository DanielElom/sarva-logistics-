import { IsString, IsNotEmpty } from 'class-validator';

export class LoginPasswordDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string; // phone or email

  @IsString()
  @IsNotEmpty()
  password!: string;
}
