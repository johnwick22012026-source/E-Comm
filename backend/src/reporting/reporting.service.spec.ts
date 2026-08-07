import { Decimal } from '@prisma/client/runtime/library'
import { PrismaService } from '../prisma/prisma.service'
import { RiskImpact, RiskLikelihood, RiskSeverity, RiskStatus } from '@prisma/client'
import { ReportingService } from './reporting.service'
import { RiskRegisterQueryDto } from './dto/risk-register-query.dto'

describe('ReportingService', () => {
  let prismaMock: Partial<PrismaService>
  let reportingService: ReportingService

  beforeEach(() => {
    prismaMock = {
      riskRegisterItem: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    }
    reportingService = new ReportingService(prismaMock as PrismaService)
  })

  it('includes root cause, fix summary, and modified files for each risk register finding', async () => {
    const mockItem = {
      id: 1,
      title: 'Inventory sync lag',
      description: 'Inventory snapshot misses late updates.',
      severity: RiskSeverity.MAJOR,
      impact: RiskImpact.MAJOR,
      likelihood: RiskLikelihood.LIKELY,
      status: RiskStatus.CONFIRMED,
      priority: 1,
      riskScore: new Decimal(8),
      sourceContext: 'Inventory sync worker',
      metadata: null,
      rootCause: 'Sync worker processed updates out of order.',
      fixSummary: 'Added ordering guarantees before applying inventory diffs.',
      modifiedFiles: ['inventory/sync.worker.ts', 'inventory/consistency.spec.ts'],
      updatedAt: new Date(),
    }

    ;(prismaMock.riskRegisterItem?.findMany as jest.Mock).mockResolvedValue([mockItem])
    ;(prismaMock.riskRegisterItem?.count as jest.Mock).mockResolvedValue(1)

    const result = await reportingService.getRiskRegister({} as RiskRegisterQueryDto)

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: mockItem.id,
      title: mockItem.title,
      description: mockItem.description,
      rootCause: mockItem.rootCause,
      fixSummary: mockItem.fixSummary,
      modifiedFiles: mockItem.modifiedFiles,
    })
  })
})
