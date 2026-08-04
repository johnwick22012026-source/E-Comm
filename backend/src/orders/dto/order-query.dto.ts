import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export enum OrderSortField {
  CREATED_AT = 'createdAt',
  AMOUNT = 'amount',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20

  @IsOptional()
  @IsEnum(OrderSortField)
  sortBy: OrderSortField = OrderSortField.CREATED_AT

  @IsOptional()
  @IsEnum(SortDirection)
  sortDirection: SortDirection = SortDirection.DESC
}
