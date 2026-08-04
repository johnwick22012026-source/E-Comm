import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateAddressDto {
  @IsString()
  @IsOptional()
  @MaxLength(32)
  label?: string

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  fullName!: string

  @IsString()
  @IsOptional()
  @MaxLength(128)
  company?: string

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  streetLine1!: string

  @IsString()
  @IsOptional()
  @MaxLength(256)
  streetLine2?: string

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  city!: string

  @IsString()
  @IsOptional()
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

  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean
}
