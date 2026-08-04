import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, parseApiError } from '../../lib/api'

type SavedPaymentMethod = {
  id: number
  maskedDisplay: string
  brand?: string | null
  expiryMonth?: number | null
  expiryYear?: number | null
  billingNickname?: string | null
  isDefault: boolean
  updatedAt: string
}

type Feedback = {
  message: string
  type: 'success' | 'error'
}

const SavedPaymentsSection = () => {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [defaultingId, setDefaultingId] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const reloadMethods = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/payment-methods`, {
        credentials: 'include',
        signal,
      })
      if (!response.ok) {
        const message = await parseApiError(response, 'Unable to load your saved payment methods.')
        throw new Error(message)
      }
      const data = await response.json()
      const items = Array.isArray(data.items) ? data.items : []
      setMethods(items)
    } catch (err) {
      if (signal && signal.aborted) {
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load payment methods.')
    } finally {
      if (!signal || !signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    reloadMethods(controller.signal)
    return () => controller.abort()
  }, [reloadMethods])

  const formatExpiry = (method: SavedPaymentMethod) => {
    if (!method.expiryMonth || !method.expiryYear) {
      return 'Expiry not available'
    }
    const padded = String(method.expiryMonth).padStart(2, '0')
    return `${padded}/${method.expiryYear}`
  }

  const handleSetDefault = async (id: number) => {
    setDefaultingId(id)
    setFeedback(null)
    try {
      const response = await fetch(`${API_BASE}/payment-methods/${id}/default`, {
        method: 'PATCH',
        credentials: 'include',
      })
      if (!response.ok) {
        const message = await parseApiError(response, 'Unable to set that method as default.')
        throw new Error(message)
      }
      const data = await response.json().catch(() => null)
      setFeedback({ message: data?.paymentMethod ? 'Default updated.' : 'Default updated.', type: 'success' })
      await reloadMethods()
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Unable to change the default method.',
        type: 'error',
      })
    } finally {
      setDefaultingId(null)
    }
  }

  const handleRemove = async (id: number) => {
    setRemovingId(id)
    setFeedback(null)
    try {
      const response = await fetch(`${API_BASE}/payment-methods/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const message = await parseApiError(response, 'Unable to remove that payment method.')
        throw new Error(message)
      }
      setFeedback({ message: 'Payment method removed.', type: 'success' })
      await reloadMethods()
    } catch (err) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Unable to remove the payment method.',
        type: 'error',
      })
    } finally {
      setRemovingId(null)
    }
  }

  const updatedAtLabel = useMemo(() => {
    if (!methods.length) return null
    const latest = methods.reduce((prev, current) =>
      new Date(current.updatedAt) > new Date(prev.updatedAt) ? current : prev,
    )
    return `Last synced ${new Date(latest.updatedAt).toLocaleDateString()}`
  }, [methods])

  return (
    <section className="account-section saved-payment-panel" aria-live="polite">
      <header className="account-section-header">
        <div>
          <p className="catalog-tag">Payment methods</p>
          <h2>Saved payment preferences</h2>
          <p className="muted">We keep only tokenized references to your cards or wallets.</p>
        </div>
        <div className="saved-payment-actions">
          <Link className="secondary" to="/checkout">
            Add a payment method
          </Link>
        </div>
      </header>
      <div className="account-section-body">
        {loading ? (
          <p className="muted">Loading saved payment methods…</p>
        ) : error ? (
          <p className="status status--error">{error}</p>
        ) : methods.length === 0 ? (
          <p className="muted">You have no saved payment methods yet. Add one during checkout.</p>
        ) : (
          <div className="saved-payment-grid">
            {methods.map((method) => (
              <article
                key={method.id}
                className={`saved-payment-card ${method.isDefault ? 'is-default' : ''}`}
              >
                <header className="saved-payment-card__header">
                  <div>
                    <p className="saved-payment-card__title">
                      {method.billingNickname ?? method.maskedDisplay}
                    </p>
                    <p className="saved-payment-card__subtitle">
                      {method.brand ?? 'Tokenized method'} • {formatExpiry(method)}
                    </p>
                  </div>
                  {method.isDefault && <span className="saved-payment-card__badge">Default</span>}
                </header>
                <p className="saved-payment-card__meta">{method.maskedDisplay}</p>
                <div className="saved-payment-card__actions">
                  {!method.isDefault && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={defaultingId === method.id}
                    >
                      {defaultingId === method.id ? 'Setting default…' : 'Set as default'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => handleRemove(method.id)}
                    disabled={removingId === method.id}
                  >
                    {removingId === method.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {feedback && (
          <p className={`status ${feedback.type === 'success' ? 'status--success' : 'status--error'}`}>
            {feedback.message}
          </p>
        )}
        {updatedAtLabel && <p className="small-muted">{updatedAtLabel}</p>}
        <p className="saved-payment-note">
          Your sensitive payment data is never stored on our servers — only tokenized references issued by the gateway are retained.
        </p>
      </div>
    </section>
  )
}

export default SavedPaymentsSection
