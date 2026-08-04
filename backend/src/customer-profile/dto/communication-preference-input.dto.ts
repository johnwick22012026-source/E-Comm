import { Type } from 'class-transformer'
import { ArrayMinSize, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { CommunicationChannel } from '@prisma/client'

export class CommunicationPreferenceInputDto {
  @IsEnum(CommunicationChannel)
  channel!: CommunicationChannel

  @IsString()
  @MaxLength(128)
  preference!: string

  @IsBoolean()
  enabled!: boolean
}

export class CommunicationPreferencesUpdateDto {
  @ValidateNested({ each: true })
  @Type(() => CommunicationPreferenceInputDto)
  @ArrayMinSize(1)
  preferences!: CommunicationPreferenceInputDto[]
}
