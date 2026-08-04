import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator'
import { PaymentMethod } from '../payment-method.enum'

export class CreateSavedPaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  gatewayToken!: string

  @IsString()
  @IsNotEmpty()
  maskedDisplay!: string

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod

  @IsOptional()
  @IsString()
  @MaxLength(64)
  brand?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth?: number

  @IsOptional()
  @IsInt()
  @Min(1900)
  expiryYear?: number

  @IsOptional()
  @IsString()
  @MaxLength(64)
  billingNickname?: string

  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean
}
