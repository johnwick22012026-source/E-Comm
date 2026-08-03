import { IsEnum, IsOptional, IsString, MaxLength, Matches, IsBooleanString } from 'class-validator'

export enum CatalogSortOption {
  POPULARITY = 'popularity',
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NAME_ASC = 'name_asc',
}

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/
const POSITIVE_INTEGER_PATTERN = /^\d+$/

export class CatalogQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  subcategory?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  brand?: string

  @IsOptional()
  @IsBooleanString()
  available?: string

  @IsOptional()
  @Matches(DECIMAL_PATTERN)
  minPrice?: string

  @IsOptional()
  @Matches(DECIMAL_PATTERN)
  maxPrice?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER_PATTERN)
  page?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER_PATTERN)
  perPage?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER_PATTERN)
  cursor?: string

  @IsOptional()
  @Matches(POSITIVE_INTEGER_PATTERN)
  limit?: string

  @IsOptional()
  @IsEnum(CatalogSortOption)
  sort?: CatalogSortOption
}
