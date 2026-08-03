import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export interface UserProfile {
  id: number
  email: string
  emailVerified: boolean
}

interface AuthContextValue {
  user: UserProfile | null
  isReady: boolean
  loading: boolean
  error: string | null
  register: (payload: { email: string; password: string }) => Promise<string>
  login: (payload: { email: string; password: string }) => Promise<UserProfile>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const jsonHeadersInit: HeadersInit = {
  'Content-Type': 'application/json',
}

function normalizeError(response: Response, fallback: string) {
  return response.json().then((body) => body?.message ?? fallback).catch(() => fallback)
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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
      const data = await response.json()
      setUser(data.user ?? null)
    } catch (err) {
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
        const serverMessage = await normalizeError(response, 'Unable to register at the moment.')
        setError(serverMessage)
        throw new Error(serverMessage)
      }
      const body = await response.json()
      return body.message ?? 'Registration successful'
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
        const serverMessage = await normalizeError(response, 'Invalid credentials')
        setError(serverMessage)
        throw new Error(serverMessage)
      }
      const data = await response.json()
      if (data.user) {
        setUser(data.user)
      }
      return data.user
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
        const serverMessage = await normalizeError(response, 'Unable to sign out right now.')
        setError(serverMessage)
        throw new Error(serverMessage)
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const value = useMemo(
    () => ({
      user,
      isReady,
      loading,
      error,
      register,
      login,
      logout,
      refreshUser,
    }),
    [user, isReady, loading, error],
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
