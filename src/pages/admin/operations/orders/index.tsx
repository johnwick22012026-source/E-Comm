import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../../../../components/Layout'
import { API_BASE, parseApiError } from '../../../../lib/api'

interface OrderListItem {
  id: number
  createdAt: string
  status: string
  totals: number
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/admin/orders?search=${encodeURIComponent(search)}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await parseApiError(res, 'Unable to fetch orders.')
          throw new Error(msg)
        }
        return res.json()
      })
      .then((data) => {
        setOrders(data.orders ?? [])
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false))
  }, [search])

  return (
    <Layout>
      <h1>Orders</h1>
      <input
        type="text"
        placeholder="Search orders..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />
      {loading && <p>Loading orders...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && orders.length === 0 && <p>No orders found.</p>}
      {!loading && !error && orders.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link to={`/admin/operations/orders/${order.id}`}>{order.id}</Link>
                </td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>{order.status}</td>
                <td>{order.totals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  )
}
