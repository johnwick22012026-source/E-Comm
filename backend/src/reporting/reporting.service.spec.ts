import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { PrismaService } from '../prisma/prisma.service'
import { ReportingService } from './reporting.service'
import { RiskRegisterQueryDto } from './dto/risk-register-query.dto'
import {
  RiskImpact,
  RiskLikelihood,
  RiskSeverity,
  RiskStatus,
} from '@prisma/client'

describe('ReportingService - risk register', () => {
  let service: ReportingService
  let prisma: Partial<PrismaService>
  let findManyMock: jest.Mock
  let countMock: jest.Mock

  beforeEach(() => {
    findManyMock = jest.fn()
    countMock = jest.fn()
    prisma = {
      riskRegisterItem: {
        findMany: findManyMock,
        count: countMock,
      },
    } as unknown as PrismaService
    service = new ReportingService(prisma as PrismaService)
  })

  it('returns sorted risk items and highlights the top areas', async () => {
    const now = new Date()
    findManyMock.mockResolvedValue([
      {
        id: 1,
        title: 'Payment Reconciliation Lag',
        description: 'Refunds are taking longer than expected.',
        severity: RiskSeverity.HIGH,
        impact: RiskImpact.MAJOR,
        likelihood: RiskLikelihood.LIKELY,
        status: RiskStatus.CONFIRMED,
        priority: 2,
        riskScore: 18,
        sourceContext: 'Checkout',
        metadata: { team: 'finance' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        title: 'Gateway Outages',
        description: 'Payment gateway is repeatedly failing.',
        severity: RiskSeverity.CRITICAL,
        impact: RiskImpact.CATASTROPHIC,
        likelihood: RiskLikelihood.CERTAIN,
        status: RiskStatus.CONFIRMED,
        priority: 3,
        riskScore: 24,
        sourceContext: 'Payments',
        metadata: { vendor: 'PayPartner' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 3,
        title: 'Inventory Drift',
        description: 'Stock levels fluctuate without updates.',
        severity: RiskSeverity.MEDIUM,
        impact: RiskImpact.MODERATE,
        likelihood: RiskLikelihood.POSSIBLE,
        status: RiskStatus.SUSPECTED,
        priority: 1,
        riskScore: 12,
        sourceContext: 'Inventory Sync',
        metadata: { team: 'ops' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 4,
        title: 'Checkout Styling Glitch',
        description: 'Minor front-end issue on checkout button.',
        severity: RiskSeverity.LOW,
        impact: RiskImpact.NEGLIGIBLE,
        likelihood: RiskLikelihood.RARE,
        status: RiskStatus.SUSPECTED,
        priority: 5,
        riskScore: 4,
        sourceContext: 'Frontend',
        metadata: { ticket: 'UI-99' },
        createdAt: now,
        updatedAt: now,
      },
    ])
    countMock.mockResolvedValue(4)

    const response = await service.getRiskRegister({} as RiskRegisterQueryDto)

    expect(response.items.map((item) => item.id)).toEqual([2, 1, 3, 4])
    expect(response.items[0].classification).toBe(RiskStatus.CONFIRMED)
    expect(response.items[3].isTopRisk).toBe(false)
    expect(response.topRiskHighlights).toHaveLength(3)
    expect(response.items[0].impactNotes).toContain('Catastrophic')
    expect(response.topRiskHighlights[0].riskScore).toBe(24)
  })

  it('applies filters and pagination from the query', async () => {
    const now = new Date()
    findManyMock.mockResolvedValue([
      {
        id: 9,
        title: 'Confirmed Network Lag',
        description: 'Network failures confirmed during peak periods.',
        severity: RiskSeverity.HIGH,
        impact: RiskImpact.MAJOR,
        likelihood: RiskLikelihood.LIKELY,
        status: RiskStatus.CONFIRMED,
        priority: 7,
        riskScore: 13,
        sourceContext: 'Network',
        metadata: { ticket: 'NET-9' },
        createdAt: now,
        updatedAt: now,
      },
    ])
    countMock.mockResolvedValue(1)

    const query = {
      status: RiskStatus.CONFIRMED,
      minRiskScore: 10,
      limit: 50,
      offset: 5,
    } as RiskRegisterQueryDto

    await service.getRiskRegister(query)

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: RiskStatus.CONFIRMED,
          riskScore: expect.objectContaining({ gte: 10 }),
        }),
        skip: 5,
        take: 50,
      }),
    )
    expect(countMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: RiskStatus.CONFIRMED,
          riskScore: expect.objectContaining({ gte: 10 }),
        }),
      }),
    )
  })
})
