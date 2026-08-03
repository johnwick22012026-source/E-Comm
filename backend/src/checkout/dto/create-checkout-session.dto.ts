import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateCheckoutSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  referenceId?: string
}
