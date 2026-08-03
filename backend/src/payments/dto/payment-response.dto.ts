export type PaymentAuthorizationResponseDto = {
  success: boolean
  status: 'authorized' | 'failed'
  code: string
  message: string
  providerReference?: string
}
