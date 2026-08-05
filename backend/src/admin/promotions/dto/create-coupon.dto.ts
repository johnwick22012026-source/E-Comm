import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'
import { CouponDiscountType } from '@prisma/client'

export class CreateCouponDto {
  @IsString()
  code: string

  @IsOptional()
  @IsString()
  description?: string

  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  usageLimit?: number

  @IsOptional()
  @IsDateString()
  startsAt?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsInt()
  promotionId?: number

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}
