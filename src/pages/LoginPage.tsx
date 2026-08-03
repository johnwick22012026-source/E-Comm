import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationErrors: string[] = []
    if (!email.trim()) {
      validationErrors.push('Email is required.')
    }
    if (!password.trim()) {
      validationErrors.push('Password is required.')
    }
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors([])
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/', { replace: true })
    } catch (error) {
      if (error instanceof Error) {
        setErrors([error.message])
      } else {
        setErrors(['Unable to sign in right now.'])
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="card">
      <h1>Sign in</h1>
      <p className="muted">Secure sign in powered by server-side sessions.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Email</span>
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
            placeholder="Your password"
          />
        </label>
        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Login'}
        </button>
      </form>
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

export default LoginPage
