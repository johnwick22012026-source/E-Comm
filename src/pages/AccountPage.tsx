import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AccountPage = () => {
  const { user, isReady, logout, loading, error } = useAuth()

  const handleLogout = async () => {
    await logout().catch(() => {
      /* Context handles errors */
    })
  }

  if (!isReady) {
    return <p className="muted">Loading your account information…</p>
  }

  return (
    <section className="card">
      <h1>Your account</h1>
      {!user ? (
        <>
          <p className="muted">You are currently signed out.</p>
          <div className="actions">
            <Link className="secondary" to="/login">
              Sign in
            </Link>
            <Link className="secondary" to="/register">
              Create an account
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="muted">Authenticated as {user.email}</p>
          <ul className="account-details">
            <li>
              <span>Status</span>
              <strong>{user.emailVerified ? 'Email verified' : 'Email not verified'}</strong>
            </li>
            <li>
              <span>User ID</span>
              <strong>{user.id}</strong>
            </li>
          </ul>
          <button className="primary" onClick={handleLogout} disabled={loading}>
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
          {error && <p className="error">{error}</p>}
        </>
      )}
    </section>
  )
}

export default AccountPage
