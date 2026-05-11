import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+234[789][01]\d{8}$/, {
    message: 'phone must be a valid Nigerian number in E.164 format e.g. +2348012345678',
  })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  email?: string;
}
