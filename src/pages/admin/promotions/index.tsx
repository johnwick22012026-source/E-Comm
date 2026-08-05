import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, parseApiError } from '../../../lib/api'

interface Promotion {
  id: number
  name: string
  discountType: string
  discountValue: number
  minPurchaseAmount: number | null
  usageLimit: number | null
  startsAt: string | null
  expiresAt: string | null
  isActive: boolean
  coupons: any[]
}

interface ListResponse {
  items: Promotion[]
  meta: { total: number; page: number; limit: number }
}

const PromotionsPage: React.FC = () => {
  const router = useRouter()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 25

  const fetchPromotions = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (search) params.set('search', search)
      if (statusFilter === 'active') params.set('isActive', 'true')
      if (statusFilter === 'inactive') params.set('isActive', 'false')

      const res = await fetch(`${API_BASE}/admin/promotions?${params.toString()}`)
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Failed to load promotions'))
      }
      const data = (await res.json()) as ListResponse
      setPromotions(data.items)
      const pages = Math.ceil(data.meta.total / data.meta.limit)
      setTotalPages(pages || 1)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromotions()
  }, [page])

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchPromotions()
  }

  const toggleStatus = async (id: number, active: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/admin/promotions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !active }),
      })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Failed to change status'))
      }
      fetchPromotions()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div>
      <h1>Promotions</h1>
      <button onClick={() => router.push('/admin/promotions/new')}>New Promotion</button>
      <form onSubmit={handleFilter} style={{ marginTop: '1rem' }}>
        <input
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />{' '}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
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
          {promotions.length === 0 ? (
            <p>No promotions found.</p>
          ) : (
            <table border={1} cellPadding={4} cellSpacing={0} style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Discount</th>
                  <th>Active</th>
                  <th>Starts At</th>
                  <th>Expires At</th>
                  <th>Coupons</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name}</td>
                    <td>
                      {p.discountValue} {p.discountType}
                    </td>
                    <td>{p.isActive ? 'Yes' : 'No'}</td>
                    <td>{p.startsAt ? new Date(p.startsAt).toLocaleString() : '-'}</td>
                    <td>{p.expiresAt ? new Date(p.expiresAt).toLocaleString() : '-'}</td>
                    <td>{p.coupons.length}</td>
                    <td>
                      <button onClick={() => router.push(`/admin/promotions/${p.id}`)}>
                        Edit
                      </button>{' '}
                      <button onClick={() => toggleStatus(p.id, p.isActive)}>
                        {p.isActive ? 'Deactivate' : 'Activate'}
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
            <button onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default PromotionsPage
