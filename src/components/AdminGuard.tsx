import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AdminGuard() {
  const { isSupportUser, isReady, loading } = useAuth()

  if (!isReady || loading) {
    return null
  }

  if (!isSupportUser) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
