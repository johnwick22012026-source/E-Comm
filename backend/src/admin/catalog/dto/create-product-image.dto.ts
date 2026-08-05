import { IsBoolean, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class FocalPointDto {
  @IsInt()
  @Min(0)
  x: number

  @IsInt()
  @Min(0)
  y: number
}

export class CreateProductImageDto {
  @IsString()
  @IsNotEmpty()
  url: string

  @IsOptional()
  @IsString()
  altText?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => FocalPointDto)
  focalPoint?: FocalPointDto

  @IsString()
  provider: string

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}
