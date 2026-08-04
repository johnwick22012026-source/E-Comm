import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CreateOrderFromPaymentDto, PaymentCaptureStatus } from './dto/create-order-from-payment.dto'
import {
  Invoice,
  Order,
  OrderLineItem,
  PaymentAttemptStatus,
  PaymentStatus,
  Prisma,
  Shipment,
} from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { randomBytes } from 'crypto'
import { ListOrdersQueryDto, OrderSortField, SortDirection } from './dto/order-query.dto'
import {
  OrderDetailResponseDto,
  OrderListItemDto,
  OrderLineItemDto,
  OrderPaymentDto,
  OrderShipmentDto,
  OrderInvoiceDto,
} from './dto/order-response.dto'

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

  async listOrdersForCustomer(
    userId: number | undefined,
    query: ListOrdersQueryDto,
  ): Promise<{ meta: { total: number; page: number; limit: number }; data: OrderListItemDto[] }> {
    if (!userId) {
      throw new BadRequestException('Authenticated user context is required to list orders')
    }

    const skip = (query.page - 1) * query.limit
    const orderByField = this.buildOrderBy(query.sortBy, query.sortDirection)

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.findMany({
        where: { userId },
        orderBy: orderByField ? [orderByField] : undefined,
        skip,
        take: query.limit,
        include: {
          payment: true,
        },
      }),
    ])

    return {
      meta: {
        total,
        page: query.page,
        limit: query.limit,
      },
      data: orders.map((order) => this.mapListItem(order)),
    }
  }

  async getOrderDetailForCustomer(userId: number | undefined, orderId: number): Promise<OrderDetailResponseDto> {
    if (!userId) {
      throw new BadRequestException('Authenticated user context is required to fetch order details')
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        payment: true,
        orderLineItems: true,
        shipments: true,
        invoices: true,
      },
    })

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    return this.mapDetail(order)
  }

  private mapListItem(order: Order & { payment: { status: PaymentStatus; amount: Prisma.Decimal; currency: string } | null }): OrderListItemDto {
    const payment = order.payment
    const cancellability = this.evaluateCancellable(order.status)

    return {
      id: order.id,
      referenceId: order.referenceId,
      status: order.status,
      createdAt: order.createdAt,
      paymentStatus: payment?.status ?? PaymentStatus.PENDING,
      amount: payment ? Number(payment.amount) : 0,
      currency: (payment?.currency ?? 'USD').toUpperCase(),
      cancellable: cancellability.cancellable,
      cancelReason: cancellability.cancelReason,
    }
  }

  private mapDetail(order: Order & {
    payment: { status: PaymentStatus; amount: Prisma.Decimal; currency: string } | null
    orderLineItems: OrderLineItem[]
    shipments: Shipment[]
    invoices: Invoice[]
  }): OrderDetailResponseDto {
    const primaryPayment = order.payment
    const lineItems = order.orderLineItems.map((item) => this.mapLineItem(item))
    const shipments = order.shipments.map((shipment) => this.mapShipment(shipment))
    const invoices = order.invoices.map((invoice) => this.mapInvoice(invoice))
    const cancellability = this.evaluateCancellable(order.status)

    return {
      id: order.id,
      referenceId: order.referenceId,
      status: order.status,
      createdAt: order.createdAt,
      payment: primaryPayment ? this.mapPayment(primaryPayment) : null,
      lineItems,
      shipments,
      invoices,
      totals: {
        amount: primaryPayment ? Number(primaryPayment.amount) : 0,
        currency: (primaryPayment?.currency ?? 'USD').toUpperCase(),
      },
      cancellable: cancellability.cancellable,
      cancelReason: cancellability.cancelReason,
    }
  }

  private mapLineItem(item: OrderLineItem): OrderLineItemDto {
    return {
      id: item.id,
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      currency: item.currency,
      metadata: item.metadata ?? null,
    }
  }

  private mapPayment(payment: { status: PaymentStatus; amount: Prisma.Decimal; currency: string }): OrderPaymentDto {
    return {
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
    }
  }

  private mapShipment(shipment: Shipment): OrderShipmentDto {
    return {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      status: shipment.status,
      estimatedDelivery: shipment.estimatedDelivery ?? null,
    }
  }

  private mapInvoice(invoice: Invoice): OrderInvoiceDto {
    return {
      id: invoice.id,
      reference: invoice.reference,
      url: invoice.url,
      issuedAt: invoice.issuedAt,
    }
  }

  private evaluateCancellable(status: OrderStatus): { cancellable: boolean; cancelReason?: string } {
    if (status === OrderStatus.CANCELLED) {
      return { cancellable: false, cancelReason: 'Order has already been cancelled' }
    }

    if (status === OrderStatus.FULFILLED || status === OrderStatus.SHIPPED) {
      return { cancellable: false, cancelReason: 'Order is already fulfilled' }
    }

    return { cancellable: true }
  }

  private buildOrderBy(sortBy: OrderSortField, direction: SortDirection) {
    if (sortBy === OrderSortField.CREATED_AT) {
      return { createdAt: direction }
    }
    if (sortBy === OrderSortField.AMOUNT) {
      return { payment: { amount: direction } }
    }
    return null
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
