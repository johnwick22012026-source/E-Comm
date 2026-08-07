import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ADMIN_ROLE_IDENTIFIERS = new Set(['admin', 'support', 'super-admin'])

export function AdminGuard() {
  const { user, isSupportUser, isReady, loading } = useAuth()

  if (!isReady || loading) {
    return null
  }

  const hasAdminRole =
    user?.roles?.some(
      (role) => typeof role === 'string' && ADMIN_ROLE_IDENTIFIERS.has(role.toLowerCase()),
    ) ?? false

  if (!isSupportUser && !hasAdminRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
