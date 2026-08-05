import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, parseApiError } from '../../../lib/api'

interface Coupon {
  id: number
  code: string
  discountType: string
  discountValue: number
  minPurchaseAmount: number | null
  usageLimit: number | null
  startsAt: string | null
  expiresAt: string | null
  isActive: boolean
  promotion: { id: number; name: string } | null
}

interface ListResponse {
  items: Coupon[]
  meta: { total: number; page: number; limit: number }
}

const COUPONS_PER_PAGE = 25

const CouponsPage: React.FC = () => {
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    const loadCoupons = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(COUPONS_PER_PAGE))
        if (search) params.set('code', search)
        if (statusFilter === 'active') params.set('isActive', 'true')
        if (statusFilter === 'inactive') params.set('isActive', 'false')

        const res = await fetch(`${API_BASE}/admin/coupons?${params.toString()}`)
        if (!res.ok) {
          throw new Error(await parseApiError(res, 'Failed to load coupons'))
        }
        const data = (await res.json()) as ListResponse
        if (!isMounted) return
        setCoupons(data.items)
        const pages = Math.ceil(data.meta.total / data.meta.limit)
        setTotalPages(pages || 1)
      } catch (e: any) {
        if (!isMounted) return
        setError(e.message)
      } finally {
        if (!isMounted) return
        setLoading(false)
      }
    }

    loadCoupons()

    return () => {
      isMounted = false
    }
  }, [page, search, statusFilter, refreshKey])

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const toggleStatus = async (id: number, active: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/admin/coupons/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !active }),
      })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Failed to change status'))
      }
      setRefreshKey((prev) => prev + 1)
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div>
      <h1>Coupons</h1>
      <button onClick={() => router.push('/admin/coupons/new')}>New Coupon</button>
      <form onSubmit={handleFilter} style={{ marginTop: '1rem' }}>
        <input
          placeholder="Search by code"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />{' '}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
            setPage(1)
          }}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>{' '}
        <button type="submit" disabled={loading}>
          Filter
        </button>
      </form>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <>
          {coupons.length === 0 ? (
            <p>No coupons found.</p>
          ) : (
            <table border={1} cellPadding={4} cellSpacing={0} style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Promotion</th>
                  <th>Active</th>
                  <th>Starts At</th>
                  <th>Expires At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.code}</td>
                    <td>
                      {c.discountValue} {c.discountType}
                    </td>
                    <td>{c.promotion?.name || '-'}</td>
                    <td>{c.isActive ? 'Yes' : 'No'}</td>
                    <td>{c.startsAt ? new Date(c.startsAt).toLocaleString() : '-'}</td>
                    <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleString() : '-'}</td>
                    <td>
                      <button onClick={() => router.push(`/admin/coupons/${c.id}`)}>Edit</button>{' '}
                      <button onClick={() => toggleStatus(c.id, c.isActive)}>
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: '1rem' }}>
            <button onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page <= 1}>
              Previous
            </button>{' '}
            <span>
              Page {page} of {totalPages}
            </span>{' '}
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default CouponsPage
