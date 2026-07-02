import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { SubscriptionPlan } from '../../../generated/prisma';

export class CreateSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  planType: SubscriptionPlan;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  tier?: number;
}
