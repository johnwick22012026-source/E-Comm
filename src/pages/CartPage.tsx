import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import QuantitySelector from '../components/QuantitySelector'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

type CartAvailability = {
  availableQuantity: number
  inventoryStatus: string
  isAvailable: boolean
}

type CartProduct = {
  id: number
  name: string
  price: number
  currency: string
  availability: CartAvailability
}

type CartItem = {
  id: number
  quantity: number
  product: CartProduct
}

type CartResponse = {
  items: CartItem[]
}

type SavedCartSnapshotPayload = {
  id: number
  name?: string | null
  createdAt: string
  restoreStatus?: string
  itemCount?: number
  items?: Array<unknown>
}

type SavedCartRestoreItem = {
  productId?: number
  name?: string
  requestedQuantity?: number
  restoredQuantity?: number
  restoreStatus?: string
  status?: string
  restoreMessage?: string
}

type SavedCartRestorePayload = {
  success?: boolean
  message?: string
  summary?: string
  error?: string
  items?: SavedCartRestoreItem[]
  messages?: string[]
  adjustments?: string[]
}

type RestoreSeverity = 'success' | 'warning' | 'error'

type RestoreFeedback = {
  summary: string
  severity: RestoreSeverity
  details: string[]
}

type ShippingInput = {
  country: string
  state?: string
  postalCode?: string
}

type PricingResponse = {
  subtotal: number
  discountTotal: number
  shippingEstimate: { cost: number }
  estimatedTotal: number
}

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

const formatTimestamp = (value: string) => {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

const summarizeRestoreSeverity = (payload: SavedCartRestorePayload): RestoreSeverity => {
  if (payload.success === false || payload.error) return 'error'
  const items = payload.items ?? []
  const hasFailure = items.some(i => (i.status ?? i.restoreStatus ?? '').toUpperCase() === 'FAILED')
  if (hasFailure) return 'warning'
  return 'success'
}

const buildRestoreDetails = (payload: SavedCartRestorePayload): string[] => {
  const details: string[] = []
  (payload.items ?? []).forEach(item => {
    const name = item.name ?? `Product ${item.productId}`
    if (item.restoredQuantity != null && item.requestedQuantity != null) {
      details.push(
        `${name}: restored ${item.restoredQuantity} of ${item.requestedQuantity}`
      )
    } else if (item.restoreMessage) {
      details.push(`${name}: ${item.restoreMessage}`)
    }
  })
  if (payload.adjustments) details.push(...payload.adjustments)
  if (payload.messages) details.push(...payload.messages)
  return details
}

const getStatusLabel = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'IN_PROGRESS': return 'Restore in progress'
    case 'FAILED': return 'Restore failed'
    case 'PENDING': return 'Snapshot pending'
    case 'COMPLETED': return 'Ready to restore'
    default: return 'Ready to restore'
  }
}

const getStatusClass = (severity: RestoreSeverity) => {
  switch (severity) {
    case 'success': return 'status--success'
    case 'warning': return 'status--warning'
    case 'error': return 'status--error'
  }
}

const CartPage = () => {
  const { user } = useAuth()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [quantityInputs, setQuantityInputs] = useState<Record<number, number>>({})
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({})
  const [updating, setUpdating] = useState<Record<number, boolean>>({})
  const [removing, setRemoving] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [couponCode, setCouponCode] = useState('')
  const [shippingInput, setShippingInput] = useState<ShippingInput>({ country: '' })
  const [pricing, setPricing] = useState<PricingResponse | null>(null)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [savedSnapshots, setSavedSnapshots] = useState<SavedCartSnapshotPayload[]>([])
  const [loadingSnapshots, setLoadingSnapshots] = useState(true)
  const [snapshotError, setSnapshotError] = useState<string | null>(null)
  const [restoringSnapshot, setRestoringSnapshot] = useState<number | null>(null)
  const [restoreFeedback, setRestoreFeedback] = useState<RestoreFeedback | null>(null)

  const loadCart = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/cart`, { credentials: 'include', signal })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || 'Unable to load cart')
      const data: CartResponse = await res.json()
      setCartItems(data.items)
      const map: Record<number, number> = {}
      data.items.forEach(i => { map[i.id] = i.quantity })
      setQuantityInputs(map)
      setItemErrors({})
    } catch (err: any) {
      if (!(err.name === 'AbortError')) setError(err.message || 'Error loading cart')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const c = new AbortController()
    loadCart(c.signal)
    return () => c.abort()
  }, [loadCart])

  // Pricing form
  const handlePricingSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPricingLoading(true)
    setPricingError(null)
    try {
      const res = await fetch(`${API_BASE}/cart/pricing`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode.trim() || undefined,
          shippingDestination: shippingInput,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || 'Pricing error')
      const data: PricingResponse = await res.json()
      setPricing(data)
    } catch (err: any) {
      setPricingError(err.message || 'Error estimating pricing')
      setPricing(null)
    } finally {
      setPricingLoading(false)
    }
  }

  const loadSnapshots = useCallback(async (signal?: AbortSignal) => {
    if (!user) return setSavedSnapshots([])
    setLoadingSnapshots(true)
    setSnapshotError(null)
    try {
      const res = await fetch(`${API_BASE}/cart/snapshots`, { credentials: 'include', signal })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || 'Snapshots load error')
      const body = await res.json()
      setSavedSnapshots(Array.isArray(body.snapshots) ? body.snapshots : body.items || [])
    } catch (err: any) {
      if (!(err.name === 'AbortError')) setSnapshotError(err.message)
    } finally {
      setLoadingSnapshots(false)
    }
  }, [user])

  useEffect(() => {
    const c = new AbortController()
    loadSnapshots(c.signal)
    return () => c.abort()
  }, [loadSnapshots])

  const cartTotal = useMemo(() => cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0), [cartItems])

  return (
    <section className="cart-shell">
      <header className="cart-header">
        <div>
          <p className="catalog-tag">Cart</p>
          <h1>Your shopping bag</h1>
          <p className="muted">Review your items, apply coupons, and estimate shipping costs.</p>
        </div>
      </header>

      {/* Pricing Form */}
      <section className="cart-pricing">
        <form onSubmit={handlePricingSubmit} className="cart-pricing-form">
          <div className="cart-pricing-row">
            <label>
              Coupon code
              <input
                type="text"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                placeholder="Enter coupon"
                disabled={pricingLoading}
              />
            </label>
            <label>
              Country
              <input
                type="text"
                value={shippingInput.country}
                onChange={e => setShippingInput(si => ({ ...si, country: e.target.value }))}
                placeholder="Country code"
                disabled={pricingLoading}
                required
              />
            </label>
            <label>
              State/Region
              <input
                type="text"
                value={shippingInput.state || ''}
                onChange={e => setShippingInput(si => ({ ...si, state: e.target.value }))}
                disabled={pricingLoading}
              />
            </label>
            <label>
              Postal code
              <input
                type="text"
                value={shippingInput.postalCode || ''}
                onChange={e => setShippingInput(si => ({ ...si, postalCode: e.target.value }))}
                disabled={pricingLoading}
              />
            </label>
            <button className="primary" type="submit" disabled={pricingLoading}>
              {pricingLoading ? 'Estimating…' : 'Estimate'}
            </button>
          </div>
          {pricingError && <p className="status status--error">{pricingError}</p>}
        </form>
        {pricing && (
          <div className="cart-pricing-summary">
            <p>Subtotal: {formatCurrency(pricing.subtotal, cartItems[0]?.product.currency || 'USD')}</p>
            <p>Discount: {formatCurrency(pricing.discountTotal, cartItems[0]?.product.currency || 'USD')}</p>
            <p>Shipping: {formatCurrency(pricing.shippingEstimate.cost, cartItems[0]?.product.currency || 'USD')}</p>
            <p><strong>Estimated Total: {formatCurrency(pricing.estimatedTotal, cartItems[0]?.product.currency || 'USD')}</strong></p>
          </div>
        )}
      </section>

      {/* ... existing saved carts and cart list ... */}
      {/* (Remaining unchanged content omitted for brevity) */}
    </section>
  )
}

export default CartPage
