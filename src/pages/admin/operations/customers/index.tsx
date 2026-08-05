import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../../../../components/Layout'
import { API_BASE, parseApiError } from '../../../../lib/api'

interface CustomerListItem {
  id: number
  email: string
  createdAt: string
  emailVerified: boolean
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/admin/customers?search=${encodeURIComponent(search)}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await parseApiError(res, 'Unable to fetch customers.')
          throw new Error(msg)
        }
        return res.json()
      })
      .then((data) => setCustomers(data.customers ?? []))
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false))
  }, [search])

  return (
    <Layout>
      <h1>Customers</h1>
      <input
        type="text"
        placeholder="Search customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />
      {loading && <p>Loading customers...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && customers.length === 0 && <p>No customers found.</p>}
      {!loading && !error && customers.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Verified</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/admin/operations/customers/${c.id}`}>{c.id}</Link>
                </td>
                <td>{c.email}</td>
                <td>{c.emailVerified ? 'Yes' : 'No'}</td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  )
}
