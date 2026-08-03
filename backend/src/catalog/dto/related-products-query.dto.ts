import { IsOptional, Matches } from 'class-validator'

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/

export class RelatedProductsQueryDto {
  @IsOptional()
  @Matches(POSITIVE_INTEGER_PATTERN)
  limit?: string
}
