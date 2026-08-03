import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Prisma, PaymentAttemptStatus, PaymentStatus, OrderStatus } from '@prisma/client'
import { CreateOrderFromPaymentDto, PaymentCaptureStatus } from './dto/create-order-from-payment.dto'
import { OrdersService, OrderCreationSummary } from './orders.service'

describe('OrdersService', () => {
  let prismaMock: any
  let service: OrdersService

  beforeEach(() => {
    prismaMock = {
      paymentAttempt: { findUnique: jest.fn(), update: jest.fn() },
      order: { findFirst: jest.fn() },
      payment: { findFirst: jest.fn() },
      cart: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    }
    service = new OrdersService(prismaMock)
  })

  it('creates order and payment when payment attempt is authorized', async () => {
    prismaMock.paymentAttempt.findUnique.mockResolvedValue({
      id: 1,
      status: PaymentAttemptStatus.AUTHORIZED,
      cartId: 5,
      metadata: null,
    })
    prismaMock.order.findFirst.mockResolvedValue(null)
    prismaMock.cart.findUnique.mockResolvedValue({ id: 5, userId: 9 })

    const createdOrder = {
      id: 11,
      referenceId: 'ORD-abc',
      status: OrderStatus.CONFIRMED,
      paymentReference: 'pay-ref',
      paymentGatewayTransactionId: 'gw-ref',
      createdAt: new Date(),
    }
    const createdPayment = {
      amount: { toNumber: () => 150 } as any,
      currency: 'USD',
      status: PaymentStatus.CAPTURED,
    }

    const txRecord = {
      order: { create: jest.fn().mockResolvedValue(createdOrder) },
      payment: { create: jest.fn().mockResolvedValue(createdPayment) },
      paymentAttempt: { update: jest.fn().mockResolvedValue({}) },
    }
    prismaMock.$transaction.mockImplementation(async (fn) => fn(txRecord))

    const payload: CreateOrderFromPaymentDto = {
      paymentAttemptId: 1,
      paymentReference: 'pay-ref',
      gatewayReference: 'gw-ref',
      status: PaymentCaptureStatus.CAPTURED,
      amount: 150,
      currency: 'USD',
    }

    const summary = await service.createFromPayment(payload, 'idem-123')

    expect(prismaMock.order.findFirst).toHaveBeenCalled()
    expect(prismaMock.$transaction).toHaveBeenCalled()
    expect(summary).toEqual(expect.objectContaining({
      id: 11,
      paymentReference: 'pay-ref',
      paymentGatewayTransactionId: 'gw-ref',
      paymentStatus: PaymentStatus.CAPTURED,
      amount: 150,
      currency: 'USD',
    }))
  })

  it('reuses existing order when payment reference already stored', async () => {
    const existingOrder = {
      id: 22,
      referenceId: 'ORD-dup',
      status: OrderStatus.CONFIRMED,
      paymentReference: 'pay-ref-dup',
      paymentGatewayTransactionId: 'gw-ref-dup',
      createdAt: new Date(),
    }
    prismaMock.paymentAttempt.findUnique.mockResolvedValue({
      id: 2,
      status: PaymentAttemptStatus.AUTHORIZED,
      cartId: null,
      metadata: null,
    })
    prismaMock.order.findFirst.mockResolvedValue(existingOrder)
    prismaMock.payment.findFirst.mockResolvedValue({
      amount: new Prisma.Decimal(42),
      currency: 'USD',
      status: PaymentStatus.CAPTURED,
    })

    const payload: CreateOrderFromPaymentDto = {
      paymentAttemptId: 2,
      paymentReference: 'pay-ref-dup',
      gatewayReference: 'gw-ref-dup',
      status: PaymentCaptureStatus.AUTHORIZED,
      amount: 42,
      currency: 'USD',
    }

    const summary = await service.createFromPayment(payload, 'idem-dup')

    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(summary.id).toBe(22)
    expect(summary.paymentReference).toBe('pay-ref-dup')
  })

  it('throws when payment attempt is not authorized', async () => {
    prismaMock.paymentAttempt.findUnique.mockResolvedValue({
      id: 3,
      status: PaymentAttemptStatus.PENDING,
    })

    await expect(
      service.createFromPayment(
        {
          paymentAttemptId: 3,
          paymentReference: 'p',
          gatewayReference: 'g',
          status: PaymentCaptureStatus.AUTHORIZED,
          amount: 50,
          currency: 'USD',
        },
        'idem-xyz',
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('throws when payment attempt is missing', async () => {
    prismaMock.paymentAttempt.findUnique.mockResolvedValue(null)

    await expect(
      service.createFromPayment(
        {
          paymentAttemptId: 99,
          paymentReference: 'p',
          gatewayReference: 'g',
          status: PaymentCaptureStatus.AUTHORIZED,
          amount: 50,
          currency: 'USD',
        },
        'idem-xyz',
      ),
    ).rejects.toThrow(NotFoundException)
  })
})
