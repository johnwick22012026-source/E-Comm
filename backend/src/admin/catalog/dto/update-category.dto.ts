import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number
}
