import { PaymentAttemptStatus } from '@prisma/client'
import { CreatePaymentAuthorizationDto } from './dto/create-payment-authorization.dto'
import { PaymentsService } from './payments.service'
import { PaymentMethod } from './payment-method.enum'
import { PAYMENT_PROVIDER_TOKEN } from './constants'

describe('PaymentsService', () => {
  let service: PaymentsService
  let prismaMock: any
  let providerMock: any

  beforeEach(() => {
    prismaMock = {
      paymentAttempt: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    }
    providerMock = {
      authorizePayment: jest.fn(),
    }
    service = new PaymentsService(prismaMock, providerMock)
  })

  it('creates a pending attempt and returns an authorized response', async () => {
    const dto: CreatePaymentAuthorizationDto = {
      method: PaymentMethod.CARD,
      amount: 45,
      currency: 'usd',
      cartId: 5,
      cardToken: 'tok_test',
    }

    prismaMock.paymentAttempt.findUnique.mockResolvedValue(null)
    prismaMock.paymentAttempt.create.mockResolvedValue({ id: 1, metadata: {} })
    providerMock.authorizePayment.mockResolvedValue({ authorized: true, providerReference: 'ref-1' })
    prismaMock.paymentAttempt.update.mockResolvedValue({})

    const result = await service.authorize(42, dto, 'idem-123')

    expect(result).toEqual({
      success: true,
      status: 'authorized',
      code: 'PAYMENT_AUTHORIZED',
      message: 'Payment has been authorized.',
      providerReference: 'ref-1',
    })
    expect(prismaMock.paymentAttempt.create).toHaveBeenCalled()
    expect(prismaMock.paymentAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentAttemptStatus.AUTHORIZED,
        }),
      }),
    )
  })

  it('replays an existing failed attempt when idempotency key reused', async () => {
    prismaMock.paymentAttempt.findUnique.mockResolvedValue({
      status: PaymentAttemptStatus.FAILED,
      metadata: { response: { code: 'PAYMENT_DECLINED', message: 'Declined', status: 'failed', success: false } },
      providerReference: 'ref-old',
      failureReason: 'Declined',
    })

    const result = await service.authorize(42, {
      method: PaymentMethod.UPI,
      amount: 30,
      currency: 'USD',
      cartId: 2,
      upiId: 'user@bank',
    }, 'idem-123')

    expect(result).toEqual({
      success: false,
      status: 'failed',
      code: 'PAYMENT_DECLINED',
      message: 'Declined',
      providerReference: 'ref-old',
    })
    expect(providerMock.authorizePayment).not.toHaveBeenCalled()
  })
})
