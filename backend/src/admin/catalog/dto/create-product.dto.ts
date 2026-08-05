import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateProductDto {
  @IsString()
  name: string

  @IsString()
  slug: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: number

  @IsString()
  currency: string

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
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  availableQuantity?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reservedQuantity?: number

  @IsOptional()
  @IsString()
  inventoryStatus?: string

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ValidateIf((o) => o.salePrice !== undefined)
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  salePriceCompared?: number
}
