import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReportingDashboardPage from '../index'

describe('Admin reporting risk register UI', () => {
  const metricsResponse = {
    revenue: { total: 1200, currency: 'USD', orders: 60, averageOrderValue: 20 },
    orders: { count: 60, trend: [] },
    topProducts: [],
    inventory: [],
    customerGrowth: { totalNewCustomers: 0, trend: [] },
    salesTrends: [],
  }

  const riskResponse = {
    items: [
      {
        id: 2,
        title: 'Gateway Outages',
        description: 'Payment gateway fails on intermittent requests.',
        severity: 'CRITICAL',
        impact: 'CATASTROPHIC',
        likelihood: 'CERTAIN',
        classification: 'CONFIRMED',
        priority: 3,
        riskScore: 24,
        impactNotes: 'Catastrophic impact requires immediate attention.',
        likelihoodNotes: 'Certain: failure already observed multiple times.',
        isTopRisk: true,
      },
      {
        id: 1,
        title: 'Payment Reconciliation Lag',
        description: 'Refunds are delayed beyond SLA.',
        severity: 'HIGH',
        impact: 'MAJOR',
        likelihood: 'LIKELY',
        classification: 'CONFIRMED',
        priority: 2,
        riskScore: 18,
        impactNotes: 'Major impact on finance reporting.',
        likelihoodNotes: 'Likely: repeated occurrences during peak.',
        isTopRisk: true,
      },
      {
        id: 3,
        title: 'Inventory Drift',
        description: 'Stock updates lag for some warehouses.',
        severity: 'MEDIUM',
        impact: 'MODERATE',
        likelihood: 'POSSIBLE',
        classification: 'SUSPECTED',
        priority: 1,
        riskScore: 12,
        impactNotes: 'Moderate impact on fulfillment accuracy.',
        likelihoodNotes: 'Possible: seen in staging but not confirmed.',
        isTopRisk: true,
      },
    ],
    topRiskHighlights: [
      { id: 2, title: 'Gateway Outages', riskScore: 24, classification: 'CONFIRMED', priority: 3 },
      { id: 1, title: 'Payment Reconciliation Lag', riskScore: 18, classification: 'CONFIRMED', priority: 2 },
      { id: 3, title: 'Inventory Drift', riskScore: 12, classification: 'SUSPECTED', priority: 1 },
    ],
    totalCount: 3,
  }

  beforeEach(() => {
    const fetchMock = vi.fn((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url
      if (url.includes('/admin/reporting/dashboard')) {
        return Promise.resolve({ ok: true, json: async () => metricsResponse })
      }
      if (url.includes('/admin/reporting/risk-register')) {
        return Promise.resolve({ ok: true, json: async () => riskResponse })
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({ message: 'not found' }) })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders risk register items with classification badges and notes', async () => {
    render(<ReportingDashboardPage />)

    expect(await screen.findByText('Gateway Outages')).toBeInTheDocument()
    expect(screen.getByTestId('risk-classification-2')).toHaveTextContent('Confirmed Defect')
    expect(screen.getByTestId('risk-classification-3')).toHaveTextContent('Suspected Risk')
    expect(screen.getByText('Impact Notes: Catastrophic impact requires immediate attention.')).toBeInTheDocument()
    expect(screen.getByText('Likelihood Notes: Certain: failure already observed multiple times.')).toBeInTheDocument()
    expect(screen.getByTestId('risk-top-label-2')).toHaveTextContent('Top Risk – prioritize repairs here')
  })

  it('highlights the highest risk focus cards in priority order', async () => {
    render(<ReportingDashboardPage />)

    const highlightCards = await screen.findAllByTestId('top-risk-highlight')
    expect(highlightCards).toHaveLength(3)
    expect(highlightCards[0]).toHaveTextContent('Gateway Outages')
    expect(highlightCards[1]).toHaveTextContent('Payment Reconciliation Lag')
    expect(highlightCards[2]).toHaveTextContent('Inventory Drift')
  })
})