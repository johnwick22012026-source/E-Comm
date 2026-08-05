import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_BASE, parseApiError } from '../lib/api'

type OrderLineItem = {
  id: number
  productId: number
  sku: string | null
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  currency: string
}

type OrderShipment = {
  id: number
  trackingNumber: string
  carrier: string
  status: string
  estimatedDelivery: string | null
}

type OrderInvoice = {
  id: number
  reference: string
  url: string
  issuedAt: string
}

type OrderPayment = {
  status: string
  amount: number
  currency: string
}

type OrderTotals = {
  amount: number
  currency: string
}

type OrderDetail = {
  id: number
  referenceId: string
  status: string
  createdAt: string
  payment: OrderPayment | null
  lineItems: OrderLineItem[]
  shipments: OrderShipment[]
  invoices: OrderInvoice[]
  totals: OrderTotals
  cancellable: boolean
  cancelReason?: string | null
}

type LoadState = 'idle' | 'loading' | 'success' | 'error' | 'not-found'

type CancelState = 'idle' | 'loading' | 'success' | 'error'

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

const TRACKING_URLS: Record<string, string> = {
  UPS: 'https://www.ups.com/track?loc=en_US&tracknum=',
  FEDEX: 'https://www.fedex.com/apps/fedextrack/?tracknumbers=',
  USPS: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  DHL: 'https://www.dhl.com/en/express/tracking.html?AWB=',
}

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [state, setState] = useState<LoadState>('idle')
  const [message, setMessage] = useState<string>('')
  const [cancelState, setCancelState] = useState<CancelState>('idle')
  const [cancelError, setCancelError] = useState<string>('')

  useEffect(() => {
    if (!orderId) {
      setState('error')
      setMessage('Order ID is missing')
      return
    }
    const controller = new AbortController()
    setState('loading')
    setMessage('Loading order details…')
    fetch(`${API_BASE}/orders/${orderId}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 404) {
          setState('not-found')
          setMessage('Order not found')
          throw new Error('not-found')
        }
        if (!res.ok) {
          const err = await parseApiError(res, 'Failed to load order')
          throw new Error(err)
        }
        return res.json()
      })
      .then((data: OrderDetail) => {
        setOrder(data)
        setState('success')
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        if (state === 'not-found') return
        setState('error')
        setMessage(err instanceof Error ? err.message : 'An error occurred')
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const handleCancel = async () => {
    if (!order) return
    if (!window.confirm('Are you sure you want to cancel this order?')) return
    setCancelState('loading')
    setCancelError('')
    try {
      const res = await fetch(`${API_BASE}/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await parseApiError(res, 'Failed to cancel order')
        throw new Error(err)
      }

      setState('loading')
      const refreshed = await fetch(`${API_BASE}/orders/${order.id}`, {
        credentials: 'include',
      })
      if (!refreshed.ok) {
        const err = await parseApiError(refreshed, 'Failed to refresh order')
        throw new Error(err)
      }
      const updated: OrderDetail = await refreshed.json()
      setOrder(updated)
      setState('success')
      setCancelState('success')
    } catch (err: any) {
      setCancelState('error')
      setCancelError(err?.message ?? 'Unable to cancel order')
    }
  }

  if (state === 'loading' || state === 'idle') {
    return (
      <section className="order-detail">
        <article className="card order-card">
          <h1>Order details</h1>
          <p className="muted">{message}</p>
          <p className="status status--loading">Loading…</p>
        </article>
      </section>
    )
  }

  if (state === 'not-found') {
    return (
      <section className="order-detail">
        <article className="card order-card">
          <h1>Order not found</h1>
          <p className="muted">{message}</p>
          <Link className="primary" to="/account/orders">
            Back to orders
          </Link>
        </article>
      </section>
    )
  }

  if (state === 'error') {
    return (
      <section className="order-detail">
        <article className="card order-card">
          <h1>Something went wrong</h1>
          <p className="status status--error">{message}</p>
          <Link className="secondary" to="/account/orders">
            Back to orders
          </Link>
        </article>
      </section>
    )
  }

  if (!order) {
    return null
  }

  return (
    <section className="order-detail">
      <article className="card order-card">
        <div className="order-card__header">
          <div>
            <p className="catalog-tag">Order details</p>
            <h1>Order {order.referenceId}</h1>
            <p className="muted">Status: {order.status}</p>
          </div>
          <div className="order-card__status">
            <span className={`status status--idle`}>{order.status}</span>
            {order.payment && (
              <span
                className={`status ${order.payment.status === 'CAPTURED' ? 'status--success' : 'status--idle'}`}
              >
                Payment {order.payment.status.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        <section className="order-items">
          <h2>Items</h2>
          <div className="order-items__grid">
            {order.lineItems.map((item) => (
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

        <dl className="order-card__summary" aria-live="polite">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatCurrency(order.totals.amount, order.totals.currency)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>
              <strong>{formatCurrency(order.totals.amount, order.totals.currency)}</strong>
            </dd>
          </div>
        </dl>

        {order.shipments.length > 0 && (
          <section>
            <h2>Shipments</h2>
            <ul>
              {order.shipments.map((sh) => {
                const carrierKey = sh.carrier.toUpperCase()
                const base = TRACKING_URLS[carrierKey]
                const trackLink = base ? `${base}${encodeURIComponent(sh.trackingNumber)}` : undefined
                return (
                  <li key={sh.id}>
                    <p>
                      {sh.carrier} - {sh.status}
                      {sh.estimatedDelivery && (
                        <span className="muted"> (Est. delivery: {new Date(sh.estimatedDelivery).toLocaleDateString()})</span>
                      )}
                    </p>
                    {sh.trackingNumber && (
                      trackLink ? (
                        <a href={trackLink} target="_blank" rel="noopener noreferrer">
                          Track shipment
                        </a>
                      ) : (
                        <p>Tracking #: {sh.trackingNumber}</p>
                      )
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {order.invoices.length > 0 && (
          <section>
            <h2>Invoices</h2>
            <ul>
              {order.invoices.map((inv) => (
                <li key={inv.id}>
                  <Link className="text-button" to={inv.url} target="_blank" rel="noopener noreferrer">
                    Download {inv.reference} ({new Date(inv.issuedAt).toLocaleDateString()})
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="order-card__cta">
          <Link className="secondary" to="/account/orders">
            Back to orders
          </Link>
          {order.cancellable && (
            <button className="text-button" onClick={handleCancel} disabled={cancelState === 'loading'}>
              {cancelState === 'loading' ? 'Cancelling…' : 'Cancel order'}
            </button>
          )}
          {cancelState === 'error' && <p className="status status--error">{cancelError}</p>}
          {cancelState === 'success' && <p className="status status--success">Order cancelled</p>}
        </div>
      </article>
    </section>
  )
}

export default OrderDetailPage
