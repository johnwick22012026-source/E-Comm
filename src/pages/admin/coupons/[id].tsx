import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, parseApiError } from '../../../lib/api'

interface PromotionOption { id: number; name: string }
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
  promotionId: number | null
}

const EditCouponPage: React.FC = () => {
  const router = useRouter()
  const { id } = router.query
  const [promotions, setPromotions] = useState<PromotionOption[]>([])
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState('PERCENTAGE')
  const [discountValue, setDiscountValue] = useState('0')
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('0')
  const [usageLimit, setUsageLimit] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [promotionId, setPromotionId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const loadData = async () => {
      try {
        const [promoRes, couponRes] = await Promise.all([
          fetch(`${API_BASE}/admin/promotions?limit=100`),
          fetch(`${API_BASE}/admin/coupons/${id}`),
        ])
        const promoData = promoRes.ok ? await promoRes.json() : null
        setPromotions(promoData ? promoData.items : [])

        if (!couponRes.ok) {
          throw new Error(await parseApiError(couponRes, 'Failed to load coupon'))
        }
        const coupon = (await couponRes.json()) as Coupon
        setCode(coupon.code)
        setDiscountType(coupon.discountType)
        setDiscountValue(String(coupon.discountValue))
        setMinPurchaseAmount(coupon.minPurchaseAmount != null ? String(coupon.minPurchaseAmount) : '')
        setUsageLimit(coupon.usageLimit != null ? String(coupon.usageLimit) : '')
        setStartsAt(coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0,16) : '')
        setExpiresAt(coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0,16) : '')
        setIsActive(coupon.isActive)
        setPromotionId(coupon.promotionId != null ? String(coupon.promotionId) : '')
      } catch (e: any) {
        setError(e.message)
      } finally {
        setInitLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body: any = {
        code,
        discountType,
        discountValue: parseFloat(discountValue),
        minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : undefined,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        isActive,
        promotionId: promotionId ? parseInt(promotionId, 10) : null,
      }
      const res = await fetch(`${API_BASE}/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        throw new Error(await parseApiError(res, 'Update failed'))
      }
      router.push('/admin/coupons')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) return <p>Loading...</p>

  return (
    <div>
      <h1>Edit Coupon</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Code:{' '}
            <input value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>
            Promotion:{' '}
            <select value={promotionId} onChange={(e) => setPromotionId(e.target.value)}>
              <option value="">-- none --</option>
              {promotions.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
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

export default EditCouponPage
