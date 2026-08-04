import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(64)
  firstName?: string

  @IsString()
  @IsOptional()
  @MaxLength(64)
  lastName?: string

  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string
}
