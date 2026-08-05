import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateCategoryDto {
  @IsString()
  name: string

  @IsString()
  slug: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number
}
