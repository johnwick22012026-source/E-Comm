import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { API_BASE, parseApiError } from '../../lib/api'

type CustomerProfilePayload = {
  profile: {
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    dateOfBirth?: string | null
    updatedAt: string
  }
}

type FormState = {
  firstName: string
  lastName: string
  phone: string
  dateOfBirth: string
}

type ActionState = 'idle' | 'loading' | 'success' | 'error'

const ProfileSection = () => {
  const [form, setForm] = useState<FormState>({ firstName: '', lastName: '', phone: '', dateOfBirth: '' })
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<{ state: ActionState; message: string | null }>({ state: 'idle', message: null })

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`${API_BASE}/customer-profile/me`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await parseApiError(response, 'Unable to load profile information.')
          throw new Error(message)
        }
        return response.json()
      })
      .then((data: CustomerProfilePayload) => {
        const profile = data.profile
        setForm({
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          phone: profile.phone ?? '',
          dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
        })
        setProfileUpdatedAt(profile.updatedAt)
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return
        }
        setError(err instanceof Error ? err.message : 'Something went wrong while loading your profile.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  const canSubmit = useMemo(() => {
    return Boolean(form.firstName.trim() || form.lastName.trim() || form.phone.trim() || form.dateOfBirth.trim())
  }, [form])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) {
      setAction({ state: 'error', message: 'Fill at least one value before saving.' })
      return
    }
    setAction({ state: 'loading', message: 'Updating your profile…' })
    try {
      const response = await fetch(`${API_BASE}/customer-profile/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          phone: form.phone.trim() || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
        }),
      })
      if (!response.ok) {
        const message = await parseApiError(response, 'Unable to update your profile.')
        throw new Error(message)
      }
      const data = await response.json()
      const profile = data.profile
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
      })
      setProfileUpdatedAt(profile.updatedAt)
      setAction({ state: 'success', message: 'Profile updated successfully.' })
    } catch (err) {
      setAction({ state: 'error', message: err instanceof Error ? err.message : 'Unable to save profile.' })
    }
  }

  return (
    <section className="account-section" aria-live="polite">
      <header className="account-section-header">
        <div>
          <p className="catalog-tag">Profile</p>
          <h2>Personal information</h2>
          <p className="muted">Manage how your name and contact appear across the storefront.</p>
        </div>
        {profileUpdatedAt && (
          <span className="small-muted">Last updated {new Date(profileUpdatedAt).toLocaleDateString()}</span>
        )}
      </header>
      <div className="account-section-body">
        {loading ? (
          <p className="muted">Loading profile…</p>
        ) : error ? (
          <p className="status status--error">{error}</p>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span>First name</span>
              <input
                type="text"
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                placeholder="Jane"
              />
            </label>
            <label className="field">
              <span>Last name</span>
              <input
                type="text"
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                placeholder="Doe"
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="+1 555 0100"
              />
            </label>
            <label className="field">
              <span>Date of birth</span>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
              />
            </label>
            <button className="primary" type="submit" disabled={action.state === 'loading'}>
              {action.state === 'loading' ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        )}
        {action.message && (
          <p className={`status ${action.state === 'success' ? 'status--success' : 'status--error'}`}>
            {action.message}
          </p>
        )}
      </div>
    </section>
  )
}

export default ProfileSection
