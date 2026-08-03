import { useCallback, useEffect, useMemo, useState } from 'react'
import QuantitySelector from '../components/QuantitySelector'

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

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
  } catch (error) {
    return `${currency} ${value.toFixed(2)}`
  }
}

const CartPage = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [quantityInputs, setQuantityInputs] = useState<Record<number, number>>({})
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({})
  const [updating, setUpdating] = useState<Record<number, boolean>>({})
  const [removing, setRemoving] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setCartItems(data.items ?? [])
      setQuantityInputs(
        (data.items ?? []).reduce<Record<number, number>>((acc, item) => {
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

  const handleQuantityChange = (itemId: number, nextValue: number) => {
    setQuantityInputs(prev => ({
      ...prev,
      [itemId]: Math.max(0, nextValue),
    }))
    setItemErrors(prev => ({ ...prev, [itemId]: '' }))
  }

  const handleUpdateQuantity = async (item: CartItem) => {
    const desiredQuantity = quantityInputs[item.id] ?? item.quantity
    const availableQuantity = Math.max(0, item.product.availability.availableQuantity ?? 0)

    if (!item.product.availability.isAvailable || availableQuantity <= 0) {
      setItemErrors(prev => ({
        ...prev,
        [item.id]: 'This item is no longer available in the requested quantity.',
      }))
      return
    }

    if (desiredQuantity < 1 || desiredQuantity > availableQuantity) {
      setItemErrors(prev => ({
        ...prev,
        [item.id]: `Select a quantity between 1 and ${availableQuantity}.`,
      }))
      return
    }

    setUpdating(prev => ({ ...prev, [item.id]: true }))
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
        setItemErrors(prev => ({ ...prev, [item.id]: message }))
        return
      }
      await loadCart()
    } catch (err) {
      setItemErrors(prev => ({
        ...prev,
        [item.id]: err instanceof Error ? err.message : 'Unable to update this item.',
      }))
    } finally {
      setUpdating(prev => ({ ...prev, [item.id]: false }))
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    setItemErrors(prev => ({ ...prev, [itemId]: '' }))
    setRemoving(prev => ({ ...prev, [itemId]: true }))
    try {
      const response = await fetch(`${API_BASE}/cart/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.message ?? 'Unable to remove this item. Please try again.'
        setItemErrors(prev => ({ ...prev, [itemId]: message }))
        return
      }
      await loadCart()
    } catch (err) {
      setItemErrors(prev => ({
        ...prev,
        [itemId]: err instanceof Error ? err.message : 'Unable to remove this item.',
      }))
    } finally {
      setRemoving(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0)
  }, [cartItems])

  return (
    <section className="cart-shell">
      <header className="cart-header">
        <div>
          <p className="catalog-tag">Cart</p>
          <h1>Your shopping bag</h1>
          <p className="muted">Items are kept in sync with inventory so you can checkout confidently.</p>
        </div>
        <p className="cart-total">Estimated subtotal: {formatCurrency(cartTotal, cartItems[0]?.product.currency ?? 'USD')}</p>
      </header>

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
              {cartItems.map(item => {
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
                        onChange={value => handleQuantityChange(item.id, value)}
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
