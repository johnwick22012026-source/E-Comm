import React, { useEffect, useState } from 'react'
import { Layout } from 'src/components/Layout'
import { API_BASE, parseApiError } from '../../../lib/api'

enum Granularity {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

enum ReportType {
  REVENUE = 'REVENUE',
  ORDERS = 'ORDERS',
  TOP_PRODUCTS = 'TOP_PRODUCTS',
  INVENTORY = 'INVENTORY',
  CUSTOMER_GROWTH = 'CUSTOMER_GROWTH',
  SALES_TRENDS = 'SALES_TRENDS',
}

enum ExportFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
}

type TrendPoint = { period: string; value: number; revenue?: number }

type DashboardMetrics = {
  revenue: { total: number; currency: string; orders: number; averageOrderValue: number }
  orders: { count: number; trend: TrendPoint[] }
  topProducts: Array<{ productId: number; name: string; quantitySold: number; revenue: number }>
  inventory: Array<{ productId: number; name: string; stockQuantity: number; availableQuantity: number; reservedQuantity: number; asOf: string }>
  customerGrowth: { totalNewCustomers: number; trend: TrendPoint[] }
  salesTrends: TrendPoint[]
}

type QueryParams = { startDate: string; endDate: string; granularity: Granularity }

type RiskRegisterItem = {
  id: number
  title: string
  description?: string | null
  severity: string
  impact: string
  likelihood: string
  classification: string
  priority: number
  riskScore: number
  impactNotes: string
  likelihoodNotes: string
  isTopRisk: boolean
}

type RiskRegisterTopHighlight = {
  id: number
  title: string
  riskScore: number
  classification: string
  priority: number
}

type RiskRegisterResponse = {
  items: RiskRegisterItem[]
  topRiskHighlights: RiskRegisterTopHighlight[]
  totalCount: number
}

export default function ReportingDashboardPage() {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [granularity, setGranularity] = useState<Granularity>(Granularity.DAILY)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [riskRegister, setRiskRegister] = useState<RiskRegisterResponse | null>(null)
  const [riskLoading, setRiskLoading] = useState<boolean>(false)
  const [riskError, setRiskError] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    const prior = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30)
    setEndDate(now.toISOString().substring(0, 10))
    setStartDate(prior.toISOString().substring(0, 10))
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchMetrics()
    }
  }, [startDate, endDate, granularity])

  useEffect(() => {
    fetchRiskRegister()
  }, [])

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('startDate', startDate)
      params.set('endDate', endDate)
      params.set('granularity', granularity)
      const res = await fetch(`${API_BASE}/admin/reporting/dashboard?${params.toString()}`)
      if (!res.ok) throw await parseApiError(res, 'Failed to load dashboard')
      const data: DashboardMetrics = await res.json()
      setMetrics(data)
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const fetchRiskRegister = async () => {
    setRiskLoading(true)
    setRiskError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/reporting/risk-register`)
      if (!res.ok) throw await parseApiError(res, 'Failed to load risk register')
      const data: RiskRegisterResponse = await res.json()
      setRiskRegister(data)
    } catch (err: any) {
      setRiskError(err.message || String(err))
    } finally {
      setRiskLoading(false)
    }
  }

  const exportUrl = (type: ReportType, format: ExportFormat) => {
    const params = new URLSearchParams()
    params.set('startDate', startDate)
    params.set('endDate', endDate)
    params.set('granularity', granularity)
    params.set('reportType', type)
    params.set('format', format)
    return `${API_BASE}/admin/reporting/exports?${params.toString()}`
  }

  return (
    <Layout>
      <h1>Reporting Dashboard</h1>
      <section style={{ marginBottom: '1rem' }}>
        <label>
          Start Date:{' '}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>{' '}
        <label>
          End Date:{' '}
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>{' '}
        <label>
          Granularity:{' '}
          <select value={granularity} onChange={(e) => setGranularity(e.target.value as Granularity)}>
            <option value={Granularity.DAILY}>Daily</option>
            <option value={Granularity.WEEKLY}>Weekly</option>
            <option value={Granularity.MONTHLY}>Monthly</option>
          </select>
        </label>
      </section>
      <section style={{ marginBottom: '2rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '6px', backgroundColor: '#fff' }}>
        <h2>Risk Register</h2>
        {riskLoading && <p>Loading risk register...</p>}
        {riskError && <p style={{ color: 'red' }}>{riskError}</p>}
        {riskRegister && (
          <>
            <p style={{ marginTop: 0 }}>Total items: {riskRegister.totalCount}</p>
            {riskRegister.topRiskHighlights.length > 0 && (
              <div>
                <h3>Highest-Risk Focus</h3>
                <div data-testid="top-risk-highlights" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {riskRegister.topRiskHighlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      data-testid="top-risk-highlight"
                      style={{
                        border: '2px solid #d32f2f',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        flex: '1 1 180px',
                        backgroundColor: '#fff3f3',
                      }}
                    >
                      <strong>{highlight.title}</strong>
                      <p style={{ margin: '0.5rem 0 0' }}>Risk Score: {highlight.riskScore}</p>
                      <p style={{ margin: '0.25rem 0' }}>Priority: {highlight.priority}</p>
                      <p style={{ margin: 0 }}>Classification: {highlight.classification === 'CONFIRMED' ? 'Confirmed' : 'Suspected'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {riskRegister.items.map((item) => {
                const classificationLabel =
                  item.classification === 'CONFIRMED' ? 'Confirmed Defect' : 'Suspected Risk'
                const classificationColor = item.classification === 'CONFIRMED' ? '#c62828' : '#ef6c00'
                return (
                  <article
                    key={item.id}
                    data-testid={`risk-item-${item.id}`}
                    style={{
                      border: item.isTopRisk ? '2px solid #b71c1c' : '1px solid #ddd',
                      borderRadius: '6px',
                      padding: '1rem',
                      backgroundColor: item.isTopRisk ? '#fff5f5' : '#fff',
                      boxShadow: item.isTopRisk ? '0 0 0 2px rgba(183, 28, 28, 0.15)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                      <h3 style={{ margin: 0 }}>{item.title}</h3>
                      <span
                        data-testid={`risk-classification-${item.id}`}
                        style={{
                          color: '#fff',
                          backgroundColor: classificationColor,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.85rem',
                        }}
                      >
                        {classificationLabel}
                      </span>
                    </div>
                    <p style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>{item.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
                      <span>Impact: {item.impact}</span>
                      <span>Likelihood: {item.likelihood}</span>
                      <span>Priority: {item.priority}</span>
                      <span>Risk Score: {item.riskScore}</span>
                    </div>
                    <p style={{ margin: '0.25rem 0' }}>Impact Notes: {item.impactNotes}</p>
                    <p style={{ margin: '0.25rem 0' }}>Likelihood Notes: {item.likelihoodNotes}</p>
                    {item.isTopRisk && (
                      <strong
                        data-testid={`risk-top-label-${item.id}`}
                        style={{ color: '#c62828', display: 'inline-block', marginTop: '0.5rem' }}
                      >
                        Top Risk – prioritize repairs here
                      </strong>
                    )}
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>
      {loading && <p>Loading dashboard...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {metrics && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
              <h2>Revenue</h2>
              <p>Total: {metrics.revenue.total.toFixed(2)} {metrics.revenue.currency}</p>
              <p>Orders: {metrics.revenue.orders}</p>
              <p>Avg. Order Value: {metrics.revenue.averageOrderValue.toFixed(2)}</p>
              <a href={exportUrl(ReportType.REVENUE, ExportFormat.CSV)}>Export CSV</a>{' | '}
              <a href={exportUrl(ReportType.REVENUE, ExportFormat.EXCEL)}>Excel</a>{' | '}
              <a href={exportUrl(ReportType.REVENUE, ExportFormat.PDF)}>PDF</a>
            </div>
            <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
              <h2>Orders</h2>
              <p>Count: {metrics.orders.count}</p>
              <a href={exportUrl(ReportType.ORDERS, ExportFormat.CSV)}>Export CSV</a>{' | '}
              <a href={exportUrl(ReportType.ORDERS, ExportFormat.EXCEL)}>Excel</a>{' | '}
              <a href={exportUrl(ReportType.ORDERS, ExportFormat.PDF)}>PDF</a>
            </div>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>Orders Trend</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Period</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Orders</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {metrics.orders.trend.map((pt) => (
                  <tr key={pt.period}> 
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{pt.period}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{pt.value}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{pt.revenue?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>Top Products</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Product ID</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Name</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Qty Sold</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topProducts.map((p) => (
                  <tr key={p.productId}>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{p.productId}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{p.name}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{p.quantitySold}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{p.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a href={exportUrl(ReportType.TOP_PRODUCTS, ExportFormat.CSV)}>Export CSV</a>{' | '}
            <a href={exportUrl(ReportType.TOP_PRODUCTS, ExportFormat.EXCEL)}>Excel</a>{' | '}
            <a href={exportUrl(ReportType.TOP_PRODUCTS, ExportFormat.PDF)}>PDF</a>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>Inventory Snapshot</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>ID</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Name</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Stock</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Available</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Reserved</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>As Of</th>
                </tr>
              </thead>
              <tbody>
                {metrics.inventory.map((i) => (
                  <tr key={i.productId}>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{i.productId}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{i.name}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{i.stockQuantity}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{i.availableQuantity}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{i.reservedQuantity}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{i.asOf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a href={exportUrl(ReportType.INVENTORY, ExportFormat.CSV)}>Export CSV</a>{' | '}
            <a href={exportUrl(ReportType.INVENTORY, ExportFormat.EXCEL)}>Excel</a>{' | '}
            <a href={exportUrl(ReportType.INVENTORY, ExportFormat.PDF)}>PDF</a>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>Customer Growth</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Period</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>New Customers</th>
                </tr>
              </thead>
              <tbody>
                {metrics.customerGrowth.trend.map((g) => (
                  <tr key={g.period}>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{g.period}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{g.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a href={exportUrl(ReportType.CUSTOMER_GROWTH, ExportFormat.CSV)}>Export CSV</a>{' | '}
            <a href={exportUrl(ReportType.CUSTOMER_GROWTH, ExportFormat.EXCEL)}>Excel</a>{' | '}
            <a href={exportUrl(ReportType.CUSTOMER_GROWTH, ExportFormat.PDF)}>PDF</a>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2>Sales Trends</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Period</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Orders</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {metrics.salesTrends.map((s) => (
                  <tr key={s.period}>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{s.period}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{s.value}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{s.revenue?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a href={exportUrl(ReportType.SALES_TRENDS, ExportFormat.CSV)}>Export CSV</a>{' | '}
            <a href={exportUrl(ReportType.SALES_TRENDS, ExportFormat.EXCEL)}>Excel</a>{' | '}
            <a href={exportUrl(ReportType.SALES_TRENDS, ExportFormat.PDF)}>PDF</a>
          </section>
        </>
      )}
    </Layout>
  )
}
