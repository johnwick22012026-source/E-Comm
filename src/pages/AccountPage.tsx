import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ProfileSection from '../components/account/ProfileSection'
import AddressManagerSection from '../components/account/AddressManagerSection'
import CommunicationPreferencesSection from '../components/account/CommunicationPreferencesSection'
import PasswordChangeSection from '../components/account/PasswordChangeSection'
import SavedPaymentsSection from '../components/account/SavedPaymentsSection'

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
    <section className="card account-card">
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
          <button className="primary" onClick={handleLogout} disabled={loading}>
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
          {error && <p className="status status--error">{error}</p>}
          <div className="account-grid">
            <ProfileSection />
            <AddressManagerSection />
            <CommunicationPreferencesSection />
            <PasswordChangeSection />
            <SavedPaymentsSection />
          </div>
        </>
      )}
    </section>
  )
}

export default AccountPage
