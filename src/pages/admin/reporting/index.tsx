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

export default function ReportingDashboardPage() {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [granularity, setGranularity] = useState<Granularity>(Granularity.DAILY)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

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
