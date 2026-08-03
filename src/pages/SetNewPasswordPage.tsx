import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

type TokenStatus = 'idle' | 'verifying' | 'valid' | 'invalid'
type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

const passwordPolicy = [
  { message: 'At least 8 characters long', test: (value: string) => value.length >= 8 },
  { message: 'Includes uppercase and lowercase letters', test: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { message: 'Includes at least one number', test: (value: string) => /\d/.test(value) },
]

const SetNewPasswordPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('idle')
  const [tokenMessage, setTokenMessage] = useState('Verifying reset link…')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const policyFeedback = useMemo(
    () =>
      passwordPolicy.map((policy) => ({
        ...policy,
        met: policy.test(password),
      })),
    [password],
  )

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid')
      setTokenMessage('Reset link appears to be missing. Please request a new email.')
      return
    }

    const validateToken = async () => {
      setTokenStatus('verifying')
      try {
        const response = await fetch(`${API_BASE}/auth/password-reset/validate`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          setTokenStatus('invalid')
          setTokenMessage(data?.message ?? 'That password reset link expired or is invalid.')
          return
        }
        setTokenStatus('valid')
        setTokenMessage('Set a new password for your account.')
      } catch (error) {
        setTokenStatus('invalid')
        setTokenMessage('Unable to reach the server. Please try again later.')
      }
    }

    validateToken()
  }, [token])

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout>
    if (submitStatus === 'success') {
      redirectTimer = setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2500)
    }
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer)
      }
    }
  }, [submitStatus, navigate])

  const validateForm = () => {
    const validationErrors: string[] = []
    const trimmedPassword = password.trim()
    if (!trimmedPassword) {
      validationErrors.push('Password is required.')
    }
    const policyIssues = passwordPolicy.filter((policy) => !policy.test(trimmedPassword))
    if (policyIssues.length > 0) {
      validationErrors.push('Password does not meet the security requirements.')
    }
    if (trimmedPassword !== confirmPassword.trim()) {
      validationErrors.push('Password confirmation does not match.')
    }
    return validationErrors
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (tokenStatus !== 'valid') {
      setErrors(['Unable to update password because the reset link is invalid.'])
      return
    }
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setSubmitStatus('idle')
      return
    }
    setErrors([])
    setSubmitStatus('loading')
    try {
      const response = await fetch(`${API_BASE}/auth/password-reset`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: password.trim() }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setSubmitStatus('error')
        setSubmitMessage(data?.message ?? 'Unable to update your password. Please try again later.')
        return
      }
      setSubmitStatus('success')
      setSubmitMessage('Password updated. Redirecting to sign-in…')
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      setSubmitStatus('error')
      setSubmitMessage('Unable to reach the server. Please try again later.')
    }
  }

  return (
    <section className="card">
      <h1>Create a new password</h1>
      <p className={`muted ${tokenStatus === 'invalid' ? 'muted--error' : ''}`}>{tokenMessage}</p>
      {tokenStatus === 'valid' && (
        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              disabled={submitStatus === 'loading' || submitStatus === 'success'}
              placeholder="Create a strong password"
            />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              disabled={submitStatus === 'loading' || submitStatus === 'success'}
              placeholder="Repeat your password"
            />
          </label>
          <div className="policy-list" aria-live="polite">
            {policyFeedback.map((policy) => (
              <p
                className={`policy-item ${policy.met ? 'policy-item--met' : ''}`}
                key={policy.message}
              >
                {policy.message}
              </p>
            ))}
          </div>
          <button className="primary" type="submit" disabled={submitStatus === 'loading' || submitStatus === 'success'}>
            {submitStatus === 'loading' ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      )}
      {submitMessage && <p className={`status ${submitStatus === 'success' ? 'status--success' : 'status--error'}`}>{submitMessage}</p>}
      {errors.length > 0 && (
        <ul className="error-list" aria-live="assertive">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <div className="actions">
        <Link className="secondary" to="/login">
          Back to sign in
        </Link>
        <Link className="secondary" to="/password-reset/request">
          Request a new link
        </Link>
      </div>
    </section>
  )
}

export default SetNewPasswordPage
