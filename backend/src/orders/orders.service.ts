import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { CreateOrderFromPaymentDto, PaymentCaptureStatus } from './dto/create-order-from-payment.dto'
import { Prisma, OrderStatus, PaymentAttemptStatus, PaymentStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { randomBytes } from 'crypto'

export type OrderCreationSummary = {
  id: number
  referenceId: string
  status: OrderStatus
  paymentReference: string
  paymentGatewayTransactionId: string
  paymentStatus: PaymentStatus
  amount: number
  currency: string
  createdAt: Date
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromPayment(
    payload: CreateOrderFromPaymentDto,
    idempotencyKey: string,
  ): Promise<OrderCreationSummary> {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey)

    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { id: payload.paymentAttemptId },
    })

    if (!attempt) {
      throw new NotFoundException('Payment attempt not found')
    }

    if (attempt.status !== PaymentAttemptStatus.AUTHORIZED) {
      throw new BadRequestException('Only authorized payments can be captured and converted into orders')
    }

    const normalizedPaymentReference = payload.paymentReference.trim()
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        OR: [
          { paymentReference: normalizedPaymentReference },
          { paymentGatewayTransactionId: payload.gatewayReference.trim() },
        ],
      },
    })

    if (existingOrder) {
      const payment = await this.prisma.payment.findFirst({
        where: { paymentReference: existingOrder.paymentReference ?? undefined },
      })
      return this.mapSummary(existingOrder, payment)
    }

    if (payload.status !== PaymentCaptureStatus.AUTHORIZED && payload.status !== PaymentCaptureStatus.CAPTURED) {
      throw new BadRequestException('Payment status must represent a completed capture or authorization event')
    }

    const cartId = attempt.cartId ?? null
    const cart = cartId ? await this.prisma.cart.findUnique({ where: { id: cartId } }) : null
    const orderReference = payload.orderReference?.trim() || this.generateOrderReference()
    const userId = cart?.userId ?? null
    const isCaptured = payload.status === PaymentCaptureStatus.CAPTURED
    const now = new Date()

    const { order, payment } = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          referenceId: orderReference,
          userId,
          status: isCaptured ? OrderStatus.CONFIRMED : OrderStatus.PENDING,
          paymentReference: normalizedPaymentReference,
          paymentGatewayTransactionId: payload.gatewayReference.trim(),
          paymentConfirmedAt: isCaptured ? now : undefined,
          finalizedAt: isCaptured ? now : undefined,
        },
      })

      const createdPayment = await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          cartId,
          userId,
          status: isCaptured ? PaymentStatus.CAPTURED : PaymentStatus.AUTHORIZED,
          amount: new Prisma.Decimal(payload.amount),
          currency: payload.currency.toUpperCase(),
          gatewayReference: payload.gatewayReference.trim(),
          paymentReference: normalizedPaymentReference,
          metadata: payload.metadata ?? null,
        },
      })

      const paymentAttemptUpdateData: Prisma.PaymentAttemptUpdateInput = {
        metadata: {
          ...(attempt.metadata ?? {}),
          captureEvent: {
            idempotencyKey: normalizedKey,
            status: payload.status,
            gatewayReference: payload.gatewayReference.trim(),
          },
        },
      }

      if (isCaptured) {
        paymentAttemptUpdateData.status = PaymentAttemptStatus.CAPTURED
        paymentAttemptUpdateData.completedAt = now
      }

      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: paymentAttemptUpdateData,
      })

      return { order: createdOrder, payment: createdPayment }
    })

    return this.mapSummary(order, payment)
  }

  private mapSummary(
    order: { id: number; referenceId: string; status: OrderStatus; paymentReference: string | null; paymentGatewayTransactionId: string | null; createdAt: Date },
    payment: { amount: Prisma.Decimal; currency: string; status: PaymentStatus } | null,
  ): OrderCreationSummary {
    return {
      id: order.id,
      referenceId: order.referenceId,
      status: order.status,
      paymentReference: order.paymentReference ?? '',
      paymentGatewayTransactionId: order.paymentGatewayTransactionId ?? '',
      paymentStatus: payment?.status ?? PaymentStatus.PENDING,
      amount: payment ? Number(payment.amount) : 0,
      currency: (payment?.currency ?? 'USD').toUpperCase(),
      createdAt: order.createdAt,
    }
  }

  private normalizeIdempotencyKey(value: string | undefined) {
    const trimmed = value?.trim()
    if (!trimmed) {
      throw new BadRequestException('Idempotency-Key header is required to safely process payment callbacks')
    }
    return trimmed
  }

  private generateOrderReference() {
    return `ORD-${randomBytes(6).toString('hex')}`
  }
}
