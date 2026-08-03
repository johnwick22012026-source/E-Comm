import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

type Status = 'idle' | 'loading' | 'success' | 'error'

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Verifying your email…')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Verification link appeared to be malformed. Please check your email.')
      return
    }

    const verify = async () => {
      setStatus('loading')
      try {
        const response = await fetch(`${API_BASE}/auth/verify-email`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          const serverMessage = data?.message ?? 'Unable to verify your email.'
          setStatus('error')
          setMessage(serverMessage)
          return
        }
        const data = await response.json()
        setStatus('success')
        setMessage(data?.message ?? 'Your email has been verified successfully.')
      } catch (err) {
        setStatus('error')
        setMessage('Unable to reach the server. Please try again later.')
      }
    }

    verify()
  }, [token])

  return (
    <section className="card">
      <h1>Confirm your email</h1>
      <p className={`muted ${status === 'error' ? 'muted--error' : ''}`}>{message}</p>
      {status === 'success' && (
        <Link className="primary" to="/login">
          Proceed to login
        </Link>
      )}
    </section>
  )
}

export default VerifyEmailPage
