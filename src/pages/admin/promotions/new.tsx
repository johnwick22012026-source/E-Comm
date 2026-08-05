import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, parseApiError } from '../../../lib/api'

const NewPromotionPage: React.FC = () => {
  const router = useRouter()
  const [name, setName] = useState('')
  const [discountType, setDiscountType] = useState('PERCENTAGE')
  const [discountValue, setDiscountValue] = useState('0')
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('0')
  const [usageLimit, setUsageLimit] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: any = {
        name,
        discountType,
        discountValue: parseFloat(discountValue),
        minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : undefined,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        isActive,
      }
      const res = await fetch(`${API_BASE}/admin/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Creation failed'))
      }
      router.push('/admin/promotions')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>New Promotion</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Name:{' '}
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>
            Discount Type:{' '}
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="AMOUNT">Fixed Amount</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Discount Value:{' '}
            <input
              type="number"
              step="0.01"
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Min Purchase Amount:{' '}
            <input
              type="number"
              step="0.01"
              min="0"
              value={minPurchaseAmount}
              onChange={(e) => setMinPurchaseAmount(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Usage Limit:{' '}
            <input
              type="number"
              min="0"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Starts At:{' '}
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Expires At:{' '}
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Active:{' '}
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </label>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>{' '}
          <button type="button" onClick={() => router.back()} disabled={loading}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewPromotionPage
