import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsPositive, IsString } from 'class-validator'

export enum PaymentCaptureStatus {
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
}

export class CreateOrderFromPaymentDto {
  @IsInt()
  @IsPositive()
  paymentAttemptId!: number

  @IsString()
  @IsNotEmpty()
  paymentReference!: string

  @IsString()
  @IsNotEmpty()
  gatewayReference!: string

  @IsEnum(PaymentCaptureStatus)
  status!: PaymentCaptureStatus

  @IsNumber()
  @IsPositive()
  amount!: number

  @IsString()
  @IsNotEmpty()
  currency!: string

  @IsOptional()
  @IsString()
  orderReference?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}
