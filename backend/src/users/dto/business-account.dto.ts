import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class BusinessAccountDto {
  @IsString()
  companyName!: string;

  @IsString()
  businessAddress!: string;

  @IsString()
  cacDocument!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+234[789][01]\d{8}$/, {
    message: 'phone must be a valid Nigerian number in E.164 format',
  })
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  contactDesignation?: string;

  @IsOptional()
  @IsString()
  pickupAddress?: string;
}
