import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import React from 'react'

export default function Layout() {
  const { isSupportUser } = useAuth()

  return (
    <div>
      {/* existing header/nav content */}
      <header>
        {/* ...other navigation items... */}
        {isSupportUser && (
          <nav>
            <Link to="/admin/operations">Operations</Link>
          </nav>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
