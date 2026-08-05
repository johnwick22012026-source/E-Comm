import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price?: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  listPrice?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  salePrice?: number

  @IsOptional()
  @IsDateString()
  saleStartsAt?: string

  @IsOptional()
  @IsDateString()
  saleEndsAt?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subcategoryId?: number

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
