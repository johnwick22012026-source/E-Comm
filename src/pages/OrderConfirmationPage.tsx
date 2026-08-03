import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

type OrderItem = {
  id: number
  name: string
  sku?: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  currency: string
}

type OrderDetails = {
  referenceId: string
  status: string
  paymentStatus: string
  paymentReference?: string | null
  paymentGatewayTransactionId?: string | null
  subtotal: number
  shippingTotal?: number
  total: number
  currency: string
  createdAt: string
  finalizedAt?: string | null
  items: OrderItem[]
}

type LoadState = 'idle' | 'loading' | 'success' | 'error' | 'not-found'

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(value)
  } catch (error) {
    return `${currency} ${value.toFixed(2)}`
  }
}

const extractErrorMessage = async (response: Response) => {
  try {
    const body = await response.json()
    if (body && typeof body === 'object' && 'message' in body) {
      return (body as { message?: string }).message ?? null
    }
  } catch (error) {
    // ignore JSON parse failures so we can fallback to text
  }

  try {
    const text = await response.text()
    return text || null
  } catch (error) {
    // if even reading text fails, fall through to default
  }

  return null
}

const OrderConfirmationPage = () => {
  const { orderReference } = useParams<{ orderReference: string }>()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [state, setState] = useState<LoadState>('idle')
  const [message, setMessage] = useState<string>('Preparing your order details…')

  useEffect(() => {
    if (!orderReference) {
      setState('error')
      setMessage('We could not determine which order to show. Double-check your confirmation link.')
      return
    }

    const controller = new AbortController()
    setState('loading')
    setMessage('Fetching the latest order summary…')

    fetch(`${API_BASE}/orders/${encodeURIComponent(orderReference)}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 404) {
          setState('not-found')
          setMessage('We cannot find an order matching that reference. It may still be processing.')
          throw new Error('Order not found')
        }
        if (!response.ok) {
          const errorMessage = (await extractErrorMessage(response)) ?? 'Unable to load your order right now.'
          throw new Error(errorMessage)
        }
        return response.json()
      })
      .then((data: OrderDetails) => {
        setOrder(data)
        setState('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }
        if (state === 'not-found') {
          return
        }
        setState('error')
        setMessage(error instanceof Error ? error.message : 'An unexpected error occurred.')
      })

    return () => controller.abort()
  }, [orderReference])

  const successState = useMemo(() => order?.status === 'CONFIRMED', [order])
  const placedAt = useMemo(() => {
    if (!order) {
      return null
    }
    const date = new Date(order.finalizedAt ?? order.createdAt)
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString()
  }, [order])

  if (state === 'loading' || state === 'idle') {
    return (
      <section className="order-confirmation">
        <article className="card order-card">
          <h1>Order confirmation</h1>
          <p className="muted">{message}</p>
          <p className="status status--loading">Loading…</p>
        </article>
      </section>
    )
  }

  if (state === 'not-found') {
    return (
      <section className="order-confirmation">
        <article className="card order-card">
          <h1>Order not found</h1>
          <p className="muted">{message}</p>
          <Link className="primary" to="/">
            Return to account
          </Link>
        </article>
      </section>
    )
  }

  if (state === 'error') {
    return (
      <section className="order-confirmation">
        <article className="card order-card">
          <h1>Something went wrong</h1>
          <p className="status status--error">{message}</p>
          <Link className="secondary" to="/">
            Back to account
          </Link>
        </article>
      </section>
    )
  }

  if (!order) {
    return null
  }

  return (
    <section className="order-confirmation">
      <article className="card order-card">
        <div className="order-card__header">
          <div>
            <p className="catalog-tag">Order {successState ? 'confirmed' : 'status'}</p>
            <h1>Order {order.referenceId}</h1>
            <p className="muted">{successState ? 'Payment succeeded — thank you for your purchase!' : 'We are still finalizing this order.'}</p>
            {placedAt && (
              <p className="muted">Placed on {placedAt}</p>
            )}
          </div>
          <div className="order-card__status">
            <span className={`status ${successState ? 'status--success' : 'status--idle'}`}>
              {order.status}
            </span>
            <span className={`status ${order.paymentStatus === 'CAPTURED' ? 'status--success' : 'status--idle'}`}>
              Payment {order.paymentStatus.toLowerCase()}
            </span>
          </div>
        </div>

        <dl className="order-card__summary" aria-live="polite">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatCurrency(order.subtotal, order.currency)}</dd>
          </div>
          {order.shippingTotal != null && (
            <div>
              <dt>Shipping</dt>
              <dd>{formatCurrency(order.shippingTotal, order.currency)}</dd>
            </div>
          )}
          <div>
            <dt>Total</dt>
            <dd>
              <strong>{formatCurrency(order.total, order.currency)}</strong>
            </dd>
          </div>
          <div>
            <dt>Payment reference</dt>
            <dd>{order.paymentReference ?? '—'}</dd>
          </div>
          <div>
            <dt>Gateway transaction</dt>
            <dd>{order.paymentGatewayTransactionId ?? '—'}</dd>
          </div>
        </dl>

        <section className="order-items">
          <h2>Items</h2>
          <div className="order-items__grid">
            {order.items.map((item) => (
              <article key={item.id} className="order-item-card">
                <div>
                  <h3>{item.name}</h3>
                  {item.sku && <p className="muted">SKU: {item.sku}</p>}
                </div>
                <div className="order-item-card__details">
                  <p>
                    {item.quantity} × {formatCurrency(item.unitPrice, item.currency)}
                  </p>
                  <p className="muted">{formatCurrency(item.totalPrice, item.currency)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="order-card__cta">
          <Link className="primary" to="/catalog">
            Continue shopping
          </Link>
          <Link className="text-button" to="/cart">
            View cart
          </Link>
        </div>
      </article>
    </section>
  )
}

export default OrderConfirmationPage
