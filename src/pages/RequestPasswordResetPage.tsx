import { FormEvent, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status = 'idle' | 'loading' | 'success' | 'error'

const RequestPasswordResetPage = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const validate = () => {
    const validationErrors: string[] = []
    if (!email.trim()) {
      validationErrors.push('Email is required.')
    } else if (!emailRegex.test(email.trim())) {
      validationErrors.push('Enter a valid email address.')
    }
    return validationErrors
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setStatus('idle')
      return
    }
    setErrors([])
    setStatus('loading')
    try {
      const response = await fetch(`${API_BASE}/auth/password-reset/request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setMessage(data?.message ?? 'Unable to process your request. Please try again later.')
        setStatus('error')
        return
      }
      setMessage('If we found an account with that email, instructions have been sent.')
      setStatus('success')
      setEmail('')
    } catch (error) {
      setMessage('Unable to reach the server. Please try again later.')
      setStatus('error')
    }
  }

  return (
    <section className="card">
      <h1>Reset your password</h1>
      <p className={`muted ${status === 'error' ? 'muted--error' : ''}`}>
        Enter the email address associated with your account and we will send password reset instructions.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (status === 'success' || status === 'error') {
                setStatus('idle')
                setMessage('')
              }
            }}
            required
            placeholder="you@email.com"
            disabled={status === 'loading'}
          />
        </label>
        <button className="primary" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending instructions…' : 'Send reset link'}
        </button>
      </form>
      {message && <p className={`status ${status === 'success' ? 'status--success' : 'status--error'}`}>{message}</p>}
      {errors.length > 0 && (
        <ul className="error-list" aria-live="assertive">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default RequestPasswordResetPage
