export class ArchitectureSummaryDto {
  overview!: string
  infrastructure!: string[]
  keyDecisions!: string[]
}

export class ReviewedScopeDto {
  domains!: string[]
  timeframe!: string
  focusAreas!: string[]
}

export class FindingsApplicabilityNoteDto {
  area!: string
  applicability!: string
}

export class FindingsApplicabilityDto {
  summary!: string
  applicabilityNotes!: FindingsApplicabilityNoteDto[]
}

export class FinalAuditReportDto {
  architectureSummary!: ArchitectureSummaryDto
  reviewedScope!: ReviewedScopeDto
  findingsApplicability!: FindingsApplicabilityDto
}
