import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CustomerDetailsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  firstName!: string

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName!: string

  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string
}
