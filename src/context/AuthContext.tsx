import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { API_BASE, parseApiError } from '../lib/api'

export interface UserProfile {
  id: number
  email: string
  emailVerified: boolean
  roles?: string[]
}

interface AuthContextValue {
  user: UserProfile | null
  isReady: boolean
  loading: boolean
  error: string | null
  isSupportUser: boolean
  register: (payload: { email: string; password: string }) => Promise<string>
  login: (payload: { email: string; password: string }) => Promise<UserProfile>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const jsonHeadersInit: HeadersInit = {
  'Content-Type': 'application/json',
}

const supportRoleIdentifiers = ['support', 'admin', 'super-admin']

const safeParseJson = async <T>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

const extractUserProfile = (payload: any): UserProfile | null => {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const candidate =
    payload.user ??
    payload.profile ??
    payload.data?.user ??
    payload.data?.profile ??
    payload
  if (!candidate || typeof candidate !== 'object') {
    return null
  }
  const rawId = candidate.id
  const numericId =
    typeof rawId === 'number'
      ? rawId
      : typeof rawId === 'string'
        ? Number(rawId)
        : NaN
  if (Number.isNaN(numericId)) {
    return null
  }
  const rawEmail = candidate.email
  if (typeof rawEmail !== 'string') {
    return null
  }
  const normalizedRoles = Array.isArray(candidate.roles)
    ? candidate.roles.filter((role): role is string => typeof role === 'string')
    : undefined

  return {
    id: numericId,
    email: rawEmail,
    emailVerified: candidate.emailVerified === true,
    roles: normalizedRoles,
  }
}

const hasSupportRole = (user: UserProfile | null) =>
  user?.roles?.some(
    (role) => typeof role === 'string' && supportRoleIdentifiers.includes(role.toLowerCase()),
  ) ?? false

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      })
      if (!response.ok) {
        setUser(null)
        return
      }
      const data = await safeParseJson<Record<string, unknown>>(response)
      const nextUser = extractUserProfile(data)
      setUser(nextUser)
    } catch (_err) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser().finally(() => setIsReady(true))
  }, [])

  const register = async (payload: { email: string; password: string }) => {
    setError(null)
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeadersInit,
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const serverMessage = await parseApiError(response, 'Unable to register at the moment.')
        setError(serverMessage)
        throw new Error(serverMessage)
      }
      const body =
        (await safeParseJson<{
          message?: string
          data?: { message?: string }
        }>(response)) ?? null
      return body?.message ?? body?.data?.message ?? 'Registration successful'
    } finally {
      setLoading(false)
    }
  }

  const login = async (payload: { email: string; password: string }) => {
    setError(null)
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: jsonHeadersInit,
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const serverMessage = await parseApiError(response, 'Invalid credentials')
        setError(serverMessage)
        throw new Error(serverMessage)
      }
      const data = await safeParseJson<Record<string, unknown>>(response)
      const nextUser = extractUserProfile(data)
      if (!nextUser) {
        const fallbackMessage = 'Unable to read your profile.'
        setError(fallbackMessage)
        throw new Error(fallbackMessage)
      }
      setUser(nextUser)
      return nextUser
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setError(null)
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        const serverMessage = await parseApiError(response, 'Unable to sign out right now.')
        setError(serverMessage)
        throw new Error(serverMessage)
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const isSupportUser = useMemo(() => {
    if (hasSupportRole(user)) {
      return true
    }
    if (!user?.email) {
      return false
    }
    const normalized = user.email.toLowerCase()
    return normalized.includes('+support') || normalized.includes('@support.')
  }, [user?.email, user?.roles])

  const value = useMemo(
    () => ({
      user,
      isReady,
      loading,
      error,
      isSupportUser,
      register,
      login,
      logout,
      refreshUser,
    }),
    [user, isReady, loading, error, isSupportUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
