import { IsString } from 'class-validator';

export class KycDto {
  @IsString()
  idDocument!: string;

  @IsString()
  licenseDocument!: string;

  @IsString()
  bikePapers!: string;

  @IsString()
  bvnNin!: string;

  @IsString()
  bikePhotoFront!: string;

  @IsString()
  bikePhotoSide!: string;

  @IsString()
  bikePhotoPlate!: string;

  @IsString()
  profilePhoto!: string;

  // V2_FEATURE: BANK_DETAILS
  // bankAccountName?: string
  // bankAccountNumber?: string
  // bankName?: string

  // V2_FEATURE: COMMISSION_MODEL
  // commissionModel?: CommissionModel
}
