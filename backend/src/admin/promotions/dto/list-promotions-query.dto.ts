import { Type, Transform } from 'class-transformer'
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ListPromotionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsDateString()
  startsAfter?: string

  @IsOptional()
  @IsDateString()
  startsBefore?: string

  @IsOptional()
  @IsDateString()
  expiresAfter?: string

  @IsOptional()
  @IsDateString()
  expiresBefore?: string
}
