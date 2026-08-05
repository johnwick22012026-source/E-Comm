import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, parseApiError } from '../lib/api'

type OrderListItem = {
  id: number
  referenceId: string
  status: string
  createdAt: string
  paymentStatus: string
  amount: number
  currency: string
  cancellable: boolean
  cancelReason?: string | null
}

type Meta = {
  total: number
  page: number
  limit: number
}

type OrdersResponse = {
  meta: Meta
  data: OrderListItem[]
}

type LoadState = 'idle' | 'loading' | 'success' | 'error'

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

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10 })
  const [state, setState] = useState<LoadState>('idle')
  const [message, setMessage] = useState<string>('')

  const fetchOrders = async (page: number) => {
    setState('loading')
    setMessage('Loading your orders…')
    try {
      const res = await fetch(
        `${API_BASE}/orders?page=${page}&limit=${meta.limit}`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        const err = await parseApiError(res, 'Failed to load orders')
        throw new Error(err)
      }
      const json = (await res.json()) as OrdersResponse
      setOrders(json.data)
      setMeta(json.meta)
      setState('success')
      if (json.data.length === 0) {
        setMessage('You have no orders yet.')
      }
    } catch (err: any) {
      setState('error')
      setMessage(err?.message ?? 'Unable to load orders')
    }
  }

  useEffect(() => {
    fetchOrders(meta.page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.page])

  const prevPage = () => {
    if (meta.page > 1) {
      setMeta((m) => ({ ...m, page: m.page - 1 }))
    }
  }
  const nextPage = () => {
    const maxPage = Math.ceil(meta.total / meta.limit)
    if (meta.page < maxPage) {
      setMeta((m) => ({ ...m, page: m.page + 1 }))
    }
  }

  return (
    <section className="order-history">
      <article className="card">
        <h1>Order History</h1>
        {(state === 'loading' || state === 'idle') && <p className="muted">{message}</p>}
        {state === 'error' && <p className="status status--error">{message}</p>}
        {state === 'success' && orders.length > 0 && (
          <>
            <table className="order-history__table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.referenceId}</td>
                    <td>{new Date(o.createdAt).toLocaleString()}</td>
                    <td>{o.status}</td>
                    <td>{o.paymentStatus.toLowerCase()}</td>
                    <td>{formatCurrency(o.amount, o.currency)}</td>
                    <td>
                      <Link className="text-button" to={`/account/orders/${o.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="order-history__pagination">
              <button onClick={prevPage} disabled={meta.page <= 1}>
                Previous
              </button>
              <span>
                Page {meta.page} of {Math.ceil(meta.total / meta.limit)}
              </span>
              <button
                onClick={nextPage}
                disabled={meta.page >= Math.ceil(meta.total / meta.limit)}
              >
                Next
              </button>
            </div>
          </>
        )}
        {state === 'success' && orders.length === 0 && <p className="muted">{message}</p>}
      </article>
    </section>
  )
}

export default OrderHistoryPage
