import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PaymentProvider, PaymentAuthorizationRequest, PaymentAuthorizationResult } from '../interfaces/payment-provider.interface'

@Injectable()
export class DummyPaymentProvider implements PaymentProvider {
  async authorizePayment(
    request: PaymentAuthorizationRequest,
  ): Promise<PaymentAuthorizationResult> {
    await new Promise((resolve) => setTimeout(resolve, 20))
    return {
      authorized: true,
      providerReference: `dummy-${request.method}-${randomUUID()}`,
    }
  }
}
