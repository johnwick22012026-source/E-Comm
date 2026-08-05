import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import React from 'react'

type LayoutProps = {
  children?: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isSupportUser } = useAuth()
  const adminLinks = [
    { label: 'Operations', to: '/admin/operations' },
    { label: 'Catalog', to: '/admin/catalog' },
    { label: 'Coupons', to: '/admin/coupons' },
    { label: 'Promotions', to: '/admin/promotions' },
    { label: 'Reporting', to: '/admin/reporting' },
  ]

  return (
    <div>
      {/* existing header/nav content */}
      <header>
        {/* ...other navigation items... */}
        {isSupportUser && (
          <nav aria-label="Admin navigation">
            <ul>
              {adminLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) => (isActive ? 'active' : undefined)}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main>{children ?? <Outlet />}</main>
    </div>
  )
}
