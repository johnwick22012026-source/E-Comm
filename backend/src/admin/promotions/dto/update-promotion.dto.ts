import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'
import { CouponDiscountType } from '@prisma/client'

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(CouponDiscountType)
  discountType?: CouponDiscountType

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  usageLimit?: number

  @IsOptional()
  @IsDateString()
  startsAt?: string | null

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}
