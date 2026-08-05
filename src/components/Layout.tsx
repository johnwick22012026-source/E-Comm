import Link from 'next/link'
import { useAuth } from '../context/AuthContext'

import React from 'react'

export function Layout({ children }: { children: React.ReactNode }) {
  const { isSupportUser } = useAuth()

  return (
    <div>
      {/* existing header/nav content */}
      <header>
        {/* ...other navigation items... */}
        {isSupportUser && (
          <nav>
            <Link href="/admin/operations">Operations</Link>
          </nav>
        )}
      </header>
      <main>{children}</main>
    </div>
  )
}
