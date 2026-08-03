import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class SelectShippingMethodDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  provider!: string

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  serviceLevel!: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  optionCode?: string
}
