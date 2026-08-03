import { useCallback, useEffect, useMemo, useState } from 'react'
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

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
  } catch (error) {
    return `${currency} ${value.toFixed(2)}`
  }
}

const formatTimestamp = (value: string) => {
  try {
    return new Date(value).toLocaleString()
  } catch (error) {
    return value
  }
}

const summarizeRestoreSeverity = (payload: SavedCartRestorePayload): RestoreSeverity => {
  if (payload.success === false || payload.error) {
    return 'error'
  }

  const items = payload.items ?? []
  const hasFailures = items.some((item) => {
    const status = (item.status ?? item.restoreStatus ?? '').toUpperCase()
    return status === 'FAILED' || status === 'UNAVAILABLE'
  })

  if (hasFailures) {
    return 'warning'
  }

  const hasAdjustments = items.some((item) => {
    if (item.requestedQuantity == null || item.restoredQuantity == null) {
      return false
    }
    return item.restoredQuantity < item.requestedQuantity
  })

  if (hasAdjustments) {
    return 'warning'
  }

  return 'success'
}

const buildRestoreDetails = (payload: SavedCartRestorePayload): string[] => {
  const details: string[] = []

  if (Array.isArray(payload.items)) {
    payload.items.forEach((item) => {
      const name = item.name ?? `Product ${item.productId ?? 'unknown'}`
      if (item.restoredQuantity != null && item.requestedQuantity != null) {
        if (item.restoredQuantity < item.requestedQuantity) {
          details.push(
            `${name}: quantity adjusted to ${item.restoredQuantity} (requested ${item.requestedQuantity}).`,
          )
        } else {
          details.push(`${name}: restored ${item.restoredQuantity}.`)
        }
        return
      }

      if (item.restoreMessage) {
        details.push(`${name}: ${item.restoreMessage}`)
        return
      }

      if (item.status) {
        details.push(`${name}: ${item.status}`)
        return
      }

      if (item.restoreStatus) {
        details.push(`${name}: ${item.restoreStatus}`)
      }
    })
  }

  if (Array.isArray(payload.adjustments)) {
    details.push(...payload.adjustments)
  }

  if (Array.isArray(payload.messages)) {
    details.push(...payload.messages)
  }

  return details
}

const getStatusLabel = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'IN_PROGRESS':
      return 'Restore in progress'
    case 'FAILED':
      return 'Restore failed'
    case 'PENDING':
      return 'Snapshot captured'
    case 'COMPLETED':
      return 'Ready to restore'
    default:
      return 'Ready to restore'
  }
}

const getStatusClass = (severity: RestoreSeverity) => {
  switch (severity) {
    case 'success':
      return 'status--success'
    case 'warning':
      return 'status--warning'
    case 'error':
      return 'status--error'
    default:
      return ''
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
      const response = await fetch(`${API_BASE}/cart`, {
        credentials: 'include',
        signal,
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message ?? 'Unable to load cart.')
      }
      const data: CartResponse = await response.json()
      const items = data.items ?? []
      setCartItems(items)
      setQuantityInputs(
        items.reduce<Record<number, number>>((acc, item) => {
          acc[item.id] = item.quantity
          return acc
        }, {}),
      )
      setItemErrors({})
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Unable to load cart data.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadCart(controller.signal)
    return () => controller.abort()
  }, [loadCart])

  const loadSnapshots = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) {
        setSavedSnapshots([])
        setLoadingSnapshots(false)
        setSnapshotError(null)
        return
      }

      setLoadingSnapshots(true)
      setSnapshotError(null)
      try {
        const response = await fetch(`${API_BASE}/cart/snapshots`, {
          credentials: 'include',
          signal,
        })
        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(body?.message ?? 'Unable to load saved carts.')
        }
        const body = await response.json()
        const list: SavedCartSnapshotPayload[] = Array.isArray(body.snapshots)
          ? body.snapshots
          : Array.isArray(body.items)
          ? body.items
          : []
        setSavedSnapshots(list)
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setSnapshotError(err instanceof Error ? err.message : 'Unable to load saved carts.')
          setSavedSnapshots([])
        }
      } finally {
        setLoadingSnapshots(false)
      }
    },
    [user],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadSnapshots(controller.signal)
    return () => controller.abort()
  }, [loadSnapshots])

  const handleQuantityChange = (itemId: number, nextValue: number) => {
    setQuantityInputs((prev) => ({
      ...prev,
      [itemId]: Math.max(0, nextValue),
    }))
    setItemErrors((prev) => ({ ...prev, [itemId]: '' }))
  }

  const handleUpdateQuantity = async (item: CartItem) => {
    const desiredQuantity = quantityInputs[item.id] ?? item.quantity
    const availableQuantity = Math.max(0, item.product.availability.availableQuantity ?? 0)

    if (!item.product.availability.isAvailable || availableQuantity <= 0) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: 'This item is no longer available in the requested quantity.',
      }))
      return
    }

    if (desiredQuantity < 1 || desiredQuantity > availableQuantity) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: `Select a quantity between 1 and ${availableQuantity}.`,
      }))
      return
    }

    setUpdating((prev) => ({ ...prev, [item.id]: true }))
    try {
      const response = await fetch(`${API_BASE}/cart/items/${item.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: desiredQuantity }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.message ?? 'Unable to update this item.\nPlease try again.'
        setItemErrors((prev) => ({ ...prev, [item.id]: message }))
        return
      }
      await loadCart()
    } catch (err) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: err instanceof Error ? err.message : 'Unable to update this item.',
      }))
    } finally {
      setUpdating((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    setItemErrors((prev) => ({ ...prev, [itemId]: '' }))
    setRemoving((prev) => ({ ...prev, [itemId]: true }))
    try {
      const response = await fetch(`${API_BASE}/cart/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.message ?? 'Unable to remove this item. Please try again.'
        setItemErrors((prev) => ({ ...prev, [itemId]: message }))
        return
      }
      await loadCart()
    } catch (err) {
      setItemErrors((prev) => ({
        ...prev,
        [itemId]: err instanceof Error ? err.message : 'Unable to remove this item.',
      }))
    } finally {
      setRemoving((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0)
  }, [cartItems])

  const handleSaveCart = async () => {
    if (!user) {
      setSaveMessage('Sign in to save your cart.')
      return
    }
    setSaving(true)
    setSaveMessage(null)
    try {
      const response = await fetch(`${API_BASE}/cart/save`, {
        method: 'POST',
        credentials: 'include',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message = payload?.message ?? 'Unable to save your cart at the moment.'
        setSaveMessage(message)
        return
      }
      setSaveMessage(payload?.message ?? 'Cart saved for later. You can restore it anytime.')
      await loadSnapshots()
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Unable to reach the server.')
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreSnapshot = async (snapshotId: number) => {
    if (!user) {
      return
    }
    setRestoringSnapshot(snapshotId)
    setRestoreFeedback(null)
    try {
      const response = await fetch(`${API_BASE}/cart/snapshots/${snapshotId}/restore`, {
        method: 'POST',
        credentials: 'include',
      })
      const payload: SavedCartRestorePayload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = payload?.message ?? payload?.error ?? 'Unable to restore this saved cart.'
        setRestoreFeedback({
          summary: message,
          severity: 'error',
          details: [],
        })
        return
      }
      const summary = payload?.message ?? payload?.summary ?? 'Cart restore completed.'
      const severity = summarizeRestoreSeverity(payload)
      const details = buildRestoreDetails(payload)
      setRestoreFeedback({ summary, severity, details })
      await loadCart()
      await loadSnapshots()
    } catch (err) {
      setRestoreFeedback({
        summary: err instanceof Error ? err.message : 'Unable to restore saved cart.',
        severity: 'error',
        details: [],
      })
    } finally {
      setRestoringSnapshot(null)
    }
  }

  return (
    <section className="cart-shell">
      <header className="cart-header">
        <div>
          <p className="catalog-tag">Cart</p>
          <h1>Your shopping bag</h1>
          <p className="muted">Items are kept in sync with inventory so you can checkout confidently.</p>
        </div>
        <p className="cart-total">
          Estimated subtotal: {formatCurrency(cartTotal, cartItems[0]?.product.currency ?? 'USD')}
        </p>
      </header>

      {user && (
        <section className="saved-cart-panel">
          <div className="saved-cart-panel__header">
            <div>
              <p className="catalog-tag">Saved carts</p>
              <h2>Keep your bag for later</h2>
              <p className="muted">Signed-in shoppers can persist their cart and restore it anytime.</p>
            </div>
            <div className="saved-cart-panel__actions">
              <button className="primary" type="button" onClick={handleSaveCart} disabled={saving || loading}>
                {saving ? 'Saving cart…' : 'Save cart for later'}
              </button>
            </div>
          </div>
          {saveMessage && <p className="status status--success">{saveMessage}</p>}
          {loadingSnapshots ? (
            <p className="muted">Checking saved carts…</p>
          ) : snapshotError ? (
            <p className="status status--error">{snapshotError}</p>
          ) : savedSnapshots.length === 0 ? (
            <p className="muted">No saved carts yet. Save your current bag to restore it later.</p>
          ) : (
            <ul className="saved-cart-snapshots">
              {savedSnapshots.map((snapshot) => {
                const itemCount =
                  snapshot.itemCount ??
                  (Array.isArray(snapshot.items) ? snapshot.items.length : undefined) ??
                  0
                return (
                  <li key={snapshot.id} className="saved-cart-snapshot">
                    <div>
                      <p className="saved-cart-snapshot__name">{snapshot.name ?? 'Saved cart snapshot'}</p>
                      <p className="muted">
                        {formatTimestamp(snapshot.createdAt)} • {itemCount} item{itemCount === 1 ? '' : 's'}
                      </p>
                      <p className="saved-cart-snapshot__status">
                        {getStatusLabel(snapshot.restoreStatus)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="secondary"
                      disabled={restoringSnapshot === snapshot.id}
                      onClick={() => handleRestoreSnapshot(snapshot.id)}
                    >
                      {restoringSnapshot === snapshot.id ? 'Restoring…' : 'Restore cart'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {restoreFeedback && (
            <div
              className={`saved-cart-feedback ${
                restoreFeedback.severity === 'warning' ? 'saved-cart-feedback--warning' : ''
              }`}
            >
              <p className={`status ${getStatusClass(restoreFeedback.severity)}`}>
                {restoreFeedback.summary}
              </p>
              {restoreFeedback.details.length > 0 && (
                <ul className="saved-cart-feedback__list">
                  {restoreFeedback.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="cart-state cart-error">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="cart-state cart-loading">
          <p>Loading your cart…</p>
        </div>
      ) : (
        <>
          {cartItems.length === 0 ? (
            <div className="cart-state cart-empty">
              <p>Your cart is empty. Add a product to see it here.</p>
            </div>
          ) : (
            <ul className="cart-list">
              {cartItems.map((item) => {
                const currentQuantity = quantityInputs[item.id] ?? item.quantity
                const availableQuantity = Math.max(0, item.product.availability.availableQuantity ?? 0)
                const isUnavailable = !item.product.availability.isAvailable || availableQuantity <= 0
                const cannotUpdate =
                  isUnavailable ||
                  currentQuantity < 1 ||
                  currentQuantity > availableQuantity ||
                  updating[item.id]
                const isRemoving = removing[item.id]

                return (
                  <li key={item.id} className="cart-item">
                    <div className="cart-item-body">
                      <div className="cart-item-details">
                        <p className="cart-item-name">{item.product.name}</p>
                        <p className="cart-item-price">
                          {formatCurrency(item.product.price, item.product.currency)} each
                        </p>
                        <p className={`cart-item-stock ${isUnavailable ? 'out-of-stock' : 'in-stock'}`}>
                          {isUnavailable
                            ? 'No longer available'
                            : `In stock (${availableQuantity} available)`}
                        </p>
                      </div>
                      <QuantitySelector
                        label="Quantity"
                        value={currentQuantity}
                        min={isUnavailable ? 0 : 1}
                        max={isUnavailable ? 0 : availableQuantity}
                        error={
                          currentQuantity > availableQuantity
                            ? `Only ${availableQuantity} units are available.`
                            : undefined
                        }
                        onChange={(value) => handleQuantityChange(item.id, value)}
                        disabled={isUnavailable}
                      />
                      {itemErrors[item.id] && (
                        <p className="inline-error" role="status">
                          {itemErrors[item.id]}
                        </p>
                      )}
                    </div>
                    <div className="cart-item-actions">
                      <button
                        type="button"
                        className="secondary"
                        disabled={cannotUpdate}
                        onClick={() => handleUpdateQuantity(item)}
                      >
                        {updating[item.id] ? 'Updating…' : 'Update quantity'}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={isRemoving}
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        {isRemoving ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default CartPage
