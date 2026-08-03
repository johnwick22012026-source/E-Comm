import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export type CustomerDetails = {
  firstName: string
  lastName: string
  email: string
  phone?: string
  notes?: string
}

export type ShippingAddress = {
  fullName: string
  company?: string
  attention?: string
  streetLine1: string
  streetLine2?: string
  city: string
  state?: string
  postalCode: string
  country: string
  phone?: string
}

export type ShippingMethodOption = {
  provider: string
  serviceLevel: string
  optionCode: string
  cost: number
  currency: string
  estimatedDeliveryDays: number
  description?: string
}

export type ReviewData = any

interface CheckoutContextValue {
  sessionToken: string | null
  isReady: boolean
  createSession: () => Promise<void>
  saveCustomerDetails: (data: CustomerDetails) => Promise<void>
  saveShippingAddress: (data: ShippingAddress) => Promise<void>
  fetchShippingMethods: () => Promise<ShippingMethodOption[]>
  selectShippingMethod: (opt: {
    provider: string; serviceLevel: string; optionCode: string
  }) => Promise<void>
  fetchReview: () => Promise<ReviewData>
  clear: () => void
}

const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined)

export const CheckoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // hydrate from storage
  useEffect(() => {
    const stored = sessionStorage.getItem('checkoutSessionToken')
    if (stored) setSessionToken(stored)
    setIsReady(true)
  }, [])

  const persistToken = useCallback((token: string) => {
    sessionStorage.setItem('checkoutSessionToken', token)
    setSessionToken(token)
  }, [])

  const createSession = useCallback(async () => {
    if (sessionToken) return
    const res = await fetch(`${API_BASE}/checkout/sessions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    const body = await res.json()
    if (!res.ok || !body.sessionToken) throw new Error(body.message || 'Unable to start checkout')
    persistToken(body.sessionToken)
  }, [sessionToken, persistToken])

  const saveCustomerDetails = useCallback(async (data: CustomerDetails) => {
    await createSession()
    const token = sessionStorage.getItem('checkoutSessionToken')!
    const res = await fetch(`${API_BASE}/checkout/sessions/${token}/customer`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.message || 'Failed to save customer details')
    }
  }, [createSession])

  const saveShippingAddress = useCallback(async (data: ShippingAddress) => {
    await createSession()
    const token = sessionStorage.getItem('checkoutSessionToken')!
    const res = await fetch(`${API_BASE}/checkout/sessions/${token}/address`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.message || 'Failed to save shipping address')
    }
  }, [createSession])

  const fetchShippingMethods = useCallback(async (): Promise<ShippingMethodOption[]> => {
    const token = sessionStorage.getItem('checkoutSessionToken')
    const res = await fetch(`${API_BASE}/checkout/sessions/${token}/shipping-methods`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.message || 'Unable to load shipping methods')
    }
    return (await res.json()) as ShippingMethodOption[]
  }, [])

  const selectShippingMethod = useCallback(async (opt: {
    provider: string; serviceLevel: string; optionCode: string
  }) => {
    const token = sessionStorage.getItem('checkoutSessionToken')
    const res = await fetch(`${API_BASE}/checkout/sessions/${token}/shipping-methods`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opt),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.message || 'Failed to select shipping method')
    }
  }, [])

  const fetchReview = useCallback(async (): Promise<ReviewData> => {
    const token = sessionStorage.getItem('checkoutSessionToken')
    const res = await fetch(`${API_BASE}/checkout/sessions/${token}/review`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.message || 'Unable to load review data')
    }
    return await res.json()
  }, [])

  const clear = useCallback(() => {
    sessionStorage.removeItem('checkoutSessionToken')
    setSessionToken(null)
  }, [])

  return (
    <CheckoutContext.Provider value={{
      sessionToken,
      isReady,
      createSession,
      saveCustomerDetails,
      saveShippingAddress,
      fetchShippingMethods,
      selectShippingMethod,
      fetchReview,
      clear,
    }}>
      {children}
    </CheckoutContext.Provider>
  )
}

export const useCheckout = () => {
  const ctx = useContext(CheckoutContext)
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider')
  return ctx
}
