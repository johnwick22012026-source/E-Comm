import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const validationErrors: string[] = []
    if (!emailRegex.test(email)) {
      validationErrors.push('Enter a valid email address.')
    }
    if (password.length < 8) {
      validationErrors.push('Password must be at least 8 characters long.')
    }
    if (password !== confirmPassword) {
      validationErrors.push('Password confirmation does not match.')
    }
    return validationErrors
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setMessage(null)
      return
    }
    setErrors([])
    setSubmitting(true)
    try {
      const { message: serverMessage, verificationToken } = await register({ email, password })
      setMessage(serverMessage ?? 'Registration successful. Please verify your email.')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      const query = verificationToken ? `?token=${encodeURIComponent(verificationToken)}` : ''
      navigate(`/verify-email${query}`, { replace: true })
    } catch (error) {
      if (error instanceof Error) {
        setErrors([error.message])
      } else {
        setErrors(['Unable to complete registration.'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="card">
      <h1>Create an account</h1>
      <p className="muted">Your personal data will be kept safe with our secure auth service.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Email address</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@email.com"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </label>
        <label className="field">
          <span>Confirm password</span>
          <input
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            placeholder="Repeat your password"
          />
        </label>
        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>
      </form>
      {message && <p className="success">{message}</p>}
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

export default RegisterPage
