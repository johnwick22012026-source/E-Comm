import { IsString, Length } from 'class-validator'

export class ValidatePasswordResetDto {
  @IsString()
  @Length(64, 64)
  token!: string
}
