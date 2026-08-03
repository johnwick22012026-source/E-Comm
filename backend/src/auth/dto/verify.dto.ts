import { IsString, Length } from 'class-validator'

export class VerifyDto {
  @IsString()
  @Length(64, 64)
  token!: string
}
