import { Type, Transform } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ListCouponsQueryDto {
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
  code?: string

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  promotionId?: number
}
