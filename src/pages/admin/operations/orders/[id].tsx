import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Layout } from '../../../../components/Layout'
import { API_BASE, parseApiError } from '../../../../lib/api'

interface OrderDetail {
  id: number
  createdAt: string
  status: string
  totals: number
}

export default function EditOrderPage() {
  const router = useRouter()
  const { id } = router.query
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/admin/orders/${id}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await parseApiError(res, 'Unable to fetch order.')
          throw new Error(msg)
        }
        return res.json()
      })
      .then((data) => {
        setOrder(data.order)
        setStatus(data.order.status)
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const msg = await parseApiError(res, 'Unable to update order.')
        throw new Error(msg)
      }
      const data = await res.json()
      setOrder(data.order)
      alert('Order updated successfully.')
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) return <Layout><p>Loading order...</p></Layout>
  if (error) return <Layout><p style={{ color: 'red' }}>{error}</p></Layout>
  if (!order) return <Layout><p>No order found.</p></Layout>

  return (
    <Layout>
      <h1>Order #{order.id}</h1>
      <p>Date: {new Date(order.createdAt).toLocaleString()}</p>
      <p>Total: {order.totals}</p>
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <label>
          Status:
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          />
        </label>
        <button type="submit" style={{ marginLeft: '1rem' }}>
          Save
        </button>
      </form>
    </Layout>
  )
}
