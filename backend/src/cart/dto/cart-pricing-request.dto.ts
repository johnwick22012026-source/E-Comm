import { IsOptional, IsString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class ShippingDestinationDto {
  @IsString()
  country!: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  postalCode?: string
}

export class CartPricingRequestDto {
  @IsOptional()
  @IsString()
  couponCode?: string

  @ValidateNested()
  @Type(() => ShippingDestinationDto)
  shippingDestination!: ShippingDestinationDto
}
