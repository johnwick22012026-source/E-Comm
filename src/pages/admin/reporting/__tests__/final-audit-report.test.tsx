import { describe, expect, it, vi, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import FinalAuditReportPage from '../index'

describe('Final audit report page', () => {
  const mockReportData = {
    architectureSummary: {
      overview: 'The architecture is evolving toward a decomposed service mesh.',
      infrastructure: ['Kubernetes foundation', 'Event-driven ingestion'],
      keyDecisions: ['Centralized monitoring via OpenTelemetry', 'Single source of truth for inventory'],
    },
    reviewedScope: {
      domains: ['Catalog', 'Checkout', 'Payments'],
      timeframe: 'Q1 2024 (Jan–Mar)',
      focusAreas: ['Resiliency of payment retries', 'Consistency of catalog sync'],
    },
    findingsApplicability: {
      summary: 'Findings apply across payments, diagnostics, and reporting streams.',
      applicabilityNotes: [
        { area: 'Payments', applicability: 'Critical in high-volume windows.' },
        { area: 'Reporting', applicability: 'Impacts auditability of reconciliations.' },
      ],
    },
  }

  const stubSuccessfulFetch = () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockReportData,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
  }

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows the loading indicator while the report is being fetched', () => {
    const pendingResponse = new Promise<Response>(() => {
      // intentionally unresolved to keep the component loading
    })
    vi.stubGlobal('fetch', vi.fn(() => pendingResponse))

    render(<FinalAuditReportPage />)

    expect(screen.getByText('Loading audit report…')).toBeInTheDocument()
  })

  it('renders the architecture summary, scope, and findings from the fetched report', async () => {
    stubSuccessfulFetch()

    render(<FinalAuditReportPage />)

    expect(await screen.findByText(mockReportData.architectureSummary.overview)).toBeInTheDocument()
    mockReportData.architectureSummary.infrastructure.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument()
    })
    mockReportData.architectureSummary.keyDecisions.forEach((decision) => {
      expect(screen.getByText(decision)).toBeInTheDocument()
    })
    mockReportData.reviewedScope.domains.forEach((domain) => {
      expect(screen.getByText(domain)).toBeInTheDocument()
    })
    expect(screen.getByText(mockReportData.reviewedScope.timeframe)).toBeInTheDocument()
    mockReportData.reviewedScope.focusAreas.forEach((focus) => {
      expect(screen.getByText(focus)).toBeInTheDocument()
    })
    expect(screen.getByText(mockReportData.findingsApplicability.summary)).toBeInTheDocument()
    mockReportData.findingsApplicability.applicabilityNotes.forEach((note) => {
      expect(screen.getByText(note.area)).toBeInTheDocument()
      expect(screen.getByText(note.applicability)).toBeInTheDocument()
    })
  })

  it('displays an error alert when the report cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: async () => ({ message: 'not ok' }) })))

    render(<FinalAuditReportPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the final audit report.')
  })

  it('is reachable from the admin navigation shell', async () => {
    stubSuccessfulFetch()

    const AdminShell = () => (
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <div>
                <Link to="/admin/reporting">Final Audit Report</Link>
              </div>
            }
          />
          <Route path="/admin/reporting" element={<FinalAuditReportPage />} />
        </Routes>
      </MemoryRouter>
    )

    render(<AdminShell />)

    fireEvent.click(screen.getByRole('link', { name: /final audit report/i }))

    expect(await screen.findByRole('heading', { name: /Final Audit Report/i })).toBeInTheDocument()
  })
})
