import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { API_BASE, parseApiError } from '../../lib/api'

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

const passwordPolicy = [
  { message: 'Minimum 8 characters', test: (value: string) => value.length >= 8 },
  { message: 'Contains both upper and lower case letters', test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { message: 'Contains a number', test: (value: string) => /\d/.test(value) },
]

const PasswordChangeSection = () => {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<SubmitState>('idle')
  const [message, setMessage] = useState('Use a strong password that you have not used before.')
  const [errors, setErrors] = useState<string[]>([])

  const policyFeedback = useMemo(
    () => passwordPolicy.map((rule) => ({ ...rule, met: rule.test(next) })),
    [next],
  )

  const validate = (): string[] => {
    const validation: string[] = []
    if (!current.trim()) {
      validation.push('Enter your current password.')
    }
    const missing = passwordPolicy.filter((rule) => !rule.test(next))
    if (missing.length > 0) {
      validation.push('New password does not meet the security requirements.')
    }
    if (next.trim() !== confirm.trim()) {
      validation.push('Password confirmation does not match.')
    }
    return validation
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setStatus('error')
      setMessage('Please review the highlighted requirements before saving.')
      return
    }
    setErrors([])
    setStatus('loading')
    setMessage('Updating password…')
    try {
      const response = await fetch(`${API_BASE}/customer-profile/password`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: current.trim(),
          newPassword: next.trim(),
        }),
      })
      if (!response.ok) {
        const serverMessage = await parseApiError(response, 'Unable to update your password.')
        throw new Error(serverMessage)
      }
      const data = await response.json()
      setStatus('success')
      setMessage(data?.message ?? 'Password updated successfully.')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Password change failed.')
    }
  }

  return (
    <section className="account-section" aria-live="polite">
      <header className="account-section-header">
        <div>
          <p className="catalog-tag">Security</p>
          <h2>Change password</h2>
          <p className="muted">Update your password without leaving this page.</p>
        </div>
      </header>
      <div className="account-section-body">
        <form className="form-grid" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Current password</span>
            <input
              type="password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </label>
          <div className="policy-list" aria-live="polite">
            {policyFeedback.map((rule) => (
              <p
                key={rule.message}
                className={`policy-item ${rule.met ? 'policy-item--met' : ''}`}
              >
                {rule.message}
              </p>
            ))}
          </div>
          <button className="primary" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Saving…' : 'Update password'}
          </button>
        </form>
        <p className={`status ${status === 'success' ? 'status--success' : status === 'error' ? 'status--error' : ''}`}>
          {message}
        </p>
        {errors.length > 0 && (
          <ul className="error-list" aria-live="assertive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default PasswordChangeSection
