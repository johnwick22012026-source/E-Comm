import { PaymentMethod } from '../payment-method.enum'

export type PaymentAuthorizationRequest = {
  userId: number
  cartId: number
  amount: number
  currency: string
  method: PaymentMethod
  details: Record<string, unknown>
}

export type PaymentAuthorizationResult = {
  authorized: boolean
  providerReference?: string
  errorCode?: string
  errorMessage?: string
}

export type PaymentRefundRequest = {
  paymentReference: string
  amount: number
  currency: string
  reason?: string
  metadata?: Record<string, unknown>
}

export type PaymentRefundResult = {
  refunded: boolean
  refundReference?: string
  errorCode?: string
  errorMessage?: string
}

export interface PaymentProvider {
  authorizePayment(request: PaymentAuthorizationRequest): Promise<PaymentAuthorizationResult>
  refundPayment?(request: PaymentRefundRequest): Promise<PaymentRefundResult>
}
