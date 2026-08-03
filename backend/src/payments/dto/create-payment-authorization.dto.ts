import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsOptional,
  ValidateIf,
  IsUrl,
} from 'class-validator'
import { Type } from 'class-transformer'
import { PaymentMethod } from '../payment-method.enum'

export class CreatePaymentAuthorizationDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod

  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  amount!: number

  @IsString()
  @IsNotEmpty()
  currency!: string

  @IsNumber()
  @Type(() => Number)
  cartId!: number

  @ValidateIf((o) => o.method === PaymentMethod.CARD)
  @IsString()
  @IsNotEmpty()
  cardToken?: string

  @ValidateIf((o) => o.method === PaymentMethod.CARD)
  @IsOptional()
  @IsString()
  cardScheme?: string

  @ValidateIf((o) => o.method === PaymentMethod.UPI)
  @IsString()
  @IsNotEmpty()
  upiId?: string

  @ValidateIf((o) => o.method === PaymentMethod.NET_BANKING)
  @IsString()
  @IsNotEmpty()
  bankCode?: string

  @ValidateIf((o) => o.method === PaymentMethod.NET_BANKING)
  @IsOptional()
  @IsUrl()
  returnUrl?: string

  @ValidateIf((o) => o.method === PaymentMethod.WALLET)
  @IsString()
  @IsNotEmpty()
  walletProvider?: string

  @ValidateIf((o) => o.method === PaymentMethod.WALLET)
  @IsOptional()
  @IsString()
  walletAccount?: string

  @IsOptional()
  metadata?: Record<string, unknown>
}
