import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateProductInventoryDto {
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
}
