import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class ShippingAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  fullName!: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  company?: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  attention?: string

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  streetLine1!: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  streetLine2?: string

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  city!: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  state?: string

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  postalCode!: string

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  country!: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string
}
