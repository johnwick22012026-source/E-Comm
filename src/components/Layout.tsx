import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Layout = () => {
  const { user, loading, logout } = useAuth()
  const location = useLocation()

  const handleLogout = async () => {
    await logout().catch(() => {
      /* error shown by context */
    })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          Commerce Hub
        </Link>
        <nav className="page-nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Account
          </NavLink>
          <NavLink to="/catalog" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Catalog
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Cart
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Register
          </NavLink>
          <NavLink to="/login" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Login
          </NavLink>
        </nav>
        <div className="account-controls">
          {loading ? (
            <span className="small-muted">Checking status…</span>
          ) : user ? (
            <>
              <span className="account-email">{user.email}</span>
              <button className="text-button" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <span className="small-muted">You are signed out</span>
          )}
        </div>
      </header>
      <main className={location.pathname === '/' ? 'page page--account' : 'page'}>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
