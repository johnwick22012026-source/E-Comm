import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Layout } from '../../../../components/Layout'
import { API_BASE, parseApiError } from '../../../../lib/api'

interface CustomerDetail {
  id: number
  email: string
  emailVerified: boolean
  createdAt: string
}

export default function EditCustomerPage() {
  const router = useRouter()
  const { id } = router.query
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/admin/customers/${id}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await parseApiError(res, 'Unable to fetch customer.')
          throw new Error(msg)
        }
        return res.json()
      })
      .then((data) => {
        setCustomer(data.customer)
        setEmailVerified(data.customer.emailVerified)
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/customers/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailVerified }),
      })
      if (!res.ok) {
        const msg = await parseApiError(res, 'Unable to update customer.')
        throw new Error(msg)
      }
      const data = await res.json()
      setCustomer(data.customer)
      alert('Customer updated successfully.')
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) return <Layout><p>Loading customer...</p></Layout>
  if (error) return <Layout><p style={{ color: 'red' }}>{error}</p></Layout>
  if (!customer) return <Layout><p>No customer found.</p></Layout>

  return (
    <Layout>
      <h1>Customer #{customer.id}</h1>
      <p>Email: {customer.email}</p>
      <p>Joined: {new Date(customer.createdAt).toLocaleString()}</p>
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <label>
          Email Verified:
          <input
            type="checkbox"
            checked={emailVerified}
            onChange={(e) => setEmailVerified(e.target.checked)}
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
