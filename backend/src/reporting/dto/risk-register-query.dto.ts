import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator'
import { RiskImpact, RiskLikelihood, RiskSeverity, RiskStatus } from '@prisma/client'

export class RiskRegisterQueryDto {
  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus

  @IsOptional()
  @IsEnum(RiskSeverity)
  severity?: RiskSeverity

  @IsOptional()
  @IsEnum(RiskLikelihood)
  likelihood?: RiskLikelihood

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minRiskScore?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number
}
