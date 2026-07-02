import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { DeliveryType, PaymentMethod } from '../../../generated/prisma';

export class CreateOrderDto {
  @IsNumber()
  pickupLatitude: number;

  @IsNumber()
  pickupLongitude: number;

  @IsString()
  pickupAddress: string;

  @IsNumber()
  dropoffLatitude: number;

  @IsNumber()
  dropoffLongitude: number;

  @IsString()
  dropoffAddress: string;

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ValidateIf((o) => o.deliveryType === DeliveryType.SCHEDULED)
  @IsString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  packageDescription?: string;
}
