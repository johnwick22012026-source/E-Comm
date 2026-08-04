import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { API_BASE, parseApiError } from '../../lib/api'

type AddressPayload = {
  id: number
  label?: string | null
  fullName: string
  company?: string | null
  streetLine1: string
  streetLine2?: string | null
  city: string
  state?: string | null
  postalCode: string
  country: string
  phone?: string | null
  isDefault: boolean
}

type AddressFormValues = {
  label: string
  fullName: string
  company: string
  streetLine1: string
  streetLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
  isDefault: boolean
}

const emptyForm: AddressFormValues = {
  label: '',
  fullName: '',
  company: '',
  streetLine1: '',
  streetLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  phone: '',
  isDefault: false,
}

type Feedback = {
  message: string
  type: 'success' | 'error'
}

const AddressManagerSection = () => {
  const [addresses, setAddresses] = useState<AddressPayload[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [creating, setCreating] = useState(false)
  const [newAddress, setNewAddress] = useState<AddressFormValues>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingForm, setEditingForm] = useState<AddressFormValues>(emptyForm)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const loadAddresses = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const response = await fetch(`${API_BASE}/customer-profile/addresses`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const message = await parseApiError(response, 'Unable to load your saved addresses.')
        throw new Error(message)
      }
      const data = await response.json()
      setAddresses(Array.isArray(data.addresses) ? data.addresses : [])
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to load addresses.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAddresses()
  }, [loadAddresses])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreating(true)
    setFeedback(null)
    try {
      const payload = { ...newAddress, label: newAddress.label || undefined }
      const body = {
        ...payload,
        company: payload.company || undefined,
        streetLine2: payload.streetLine2 || undefined,
        state: payload.state || undefined,
        phone: payload.phone || undefined,
        isDefault: payload.isDefault,
      }
      const response = await fetch(`${API_BASE}/customer-profile/addresses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const message = await parseApiError(response, 'Unable to save the new address.')
        throw new Error(message)
      }
      await loadAddresses()
      setNewAddress(emptyForm)
      setFeedback({ message: 'Address saved successfully.', type: 'success' })
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : 'Unable to save address.', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (address: AddressPayload) => {
    setEditingId(address.id)
    setEditingForm({
      label: address.label ?? '',
      fullName: address.fullName,
      company: address.company ?? '',
      streetLine1: address.streetLine1,
      streetLine2: address.streetLine2 ?? '',
      city: address.city,
      state: address.state ?? '',
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone ?? '',
      isDefault: address.isDefault,
    })
  }

  const handleUpdate = async (event: FormEvent<HTMLFormElement>, addressId: number) => {
    event.preventDefault()
    setProcessingId(addressId)
    setFeedback(null)
    try {
      const payload = {
        ...editingForm,
        label: editingForm.label || undefined,
        company: editingForm.company || undefined,
        streetLine2: editingForm.streetLine2 || undefined,
        state: editingForm.state || undefined,
        phone: editingForm.phone || undefined,
      }
      const response = await fetch(`${API_BASE}/customer-profile/addresses/${addressId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const message = await parseApiError(response, 'Unable to update this address.')
        throw new Error(message)
      }
      await loadAddresses()
      setEditingId(null)
      setFeedback({ message: 'Address updated.', type: 'success' })
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : 'Unable to update address.', type: 'error' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (addressId: number) => {
    setProcessingId(addressId)
    setFeedback(null)
    try {
      const response = await fetch(`${API_BASE}/customer-profile/addresses/${addressId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const message = await parseApiError(response, 'Unable to remove this address.')
        throw new Error(message)
      }
      await loadAddresses()
      setFeedback({ message: 'Address removed.', type: 'success' })
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : 'Unable to delete address.', type: 'error' })
    } finally {
      setProcessingId(null)
    }
  }

  const hasAddresses = useMemo(() => addresses.length > 0, [addresses])

  return (
    <section className="account-section">
      <header className="account-section-header">
        <div>
          <p className="catalog-tag">Addresses</p>
          <h2>Manage saved addresses</h2>
          <p className="muted">Keep your delivery information up to date and mark a default address.</p>
        </div>
      </header>
      <div className="account-section-body">
        {loading ? (
          <p className="muted">Loading addresses…</p>
        ) : fetchError ? (
          <p className="status status--error">{fetchError}</p>
        ) : (
          <>
            {hasAddresses ? (
              <div className="address-grid">
                {addresses.map((address) => (
                  <article key={address.id} className="address-card">
                    <header>
                      <p className="muted">{address.label ?? 'Address'}</p>
                      <span className={`status ${address.isDefault ? 'status--success' : 'status--idle'}`}>
                        {address.isDefault ? 'Default' : 'Saved'}
                      </span>
                    </header>
                    {editingId === address.id ? (
                      <form className="address-form" onSubmit={(event) => handleUpdate(event, address.id)}>
                        <label>
                          Label
                          <input
                            value={editingForm.label}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, label: event.target.value }))}
                          />
                        </label>
                        <label>
                          Recipient
                          <input
                            value={editingForm.fullName}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, fullName: event.target.value }))}
                            required
                          />
                        </label>
                        <label>
                          Street
                          <input
                            value={editingForm.streetLine1}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, streetLine1: event.target.value }))
                            }
                            required
                          />
                        </label>
                        <label>
                          City
                          <input
                            value={editingForm.city}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, city: event.target.value }))}
                            required
                          />
                        </label>
                        <label>
                          Postal code
                          <input
                            value={editingForm.postalCode}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                            required
                          />
                        </label>
                        <label>
                          Country
                          <input
                            value={editingForm.country}
                            onChange={(event) => setEditingForm((prev) => ({ ...prev, country: event.target.value }))}
                            required
                          />
                        </label>
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={editingForm.isDefault}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, isDefault: event.target.checked }))
                            }
                          />
                          <span>Set as default</span>
                        </label>
                        <div className="address-actions">
                          <button className="secondary" type="button" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                          <button
                            className="primary"
                            type="submit"
                            disabled={processingId === address.id}
                          >
                            {processingId === address.id ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => handleDelete(address.id)}
                            disabled={processingId === address.id}
                          >
                            Remove
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p>
                          <strong>{address.fullName}</strong>
                        </p>
                        <p>
                          {address.streetLine1}
                          {address.streetLine2 ? `, ${address.streetLine2}` : ''}
                        </p>
                        <p>
                          {address.city}, {address.state ?? '—'} {address.postalCode}
                        </p>
                        <p>
                          {address.country} {address.phone ? `• ${address.phone}` : ''}
                        </p>
                        <div className="address-actions">
                          <button className="secondary" type="button" onClick={() => startEdit(address)}>
                            Edit
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => handleDelete(address.id)}
                            disabled={processingId === address.id}
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">No addresses saved yet.</p>
            )}
          </>
        )}
        <form className="address-form" onSubmit={handleCreate}>
          <h3 className="section-subtitle">Add a new address</h3>
          <div className="two-column-grid">
            <label>
              Label
              <input
                value={newAddress.label}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, label: event.target.value }))}
              />
            </label>
            <label>
              Recipient
              <input
                required
                value={newAddress.fullName}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, fullName: event.target.value }))}
              />
            </label>
            <label>
              Company
              <input
                value={newAddress.company}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, company: event.target.value }))}
              />
            </label>
            <label>
              Street
              <input
                required
                value={newAddress.streetLine1}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, streetLine1: event.target.value }))}
              />
            </label>
            <label>
              Street line 2
              <input
                value={newAddress.streetLine2}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, streetLine2: event.target.value }))}
              />
            </label>
            <label>
              City
              <input
                required
                value={newAddress.city}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, city: event.target.value }))}
              />
            </label>
            <label>
              State/region
              <input
                value={newAddress.state}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, state: event.target.value }))}
              />
            </label>
            <label>
              Postal code
              <input
                required
                value={newAddress.postalCode}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, postalCode: event.target.value }))}
              />
            </label>
            <label>
              Country
              <input
                required
                value={newAddress.country}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, country: event.target.value }))}
              />
            </label>
            <label>
              Phone
              <input
                value={newAddress.phone}
                onChange={(event) => setNewAddress((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </label>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={newAddress.isDefault}
              onChange={(event) => setNewAddress((prev) => ({ ...prev, isDefault: event.target.checked }))}
            />
            <span>Make this my default address</span>
          </label>
          <button className="primary" type="submit" disabled={creating}>
            {creating ? 'Saving…' : 'Save address'}
          </button>
        </form>
        {feedback && (
          <p className={`status ${feedback.type === 'success' ? 'status--success' : 'status--error'}`}>
            {feedback.message}
          </p>
        )}
      </div>
    </section>
  )
}

export default AddressManagerSection
