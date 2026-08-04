import { OrderStatus, PaymentStatus } from '@prisma/client'

export class OrderListItemDto {
  id: number
  referenceId: string
  status: OrderStatus
  createdAt: Date
  paymentStatus: PaymentStatus
  amount: number
  currency: string
  cancellable: boolean
  cancelReason?: string
}

export class OrderLineItemDto {
  id: number
  productId: number
  sku: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  currency: string
  metadata: Record<string, any> | null
}

export class OrderPaymentDto {
  status: PaymentStatus
  amount: number
  currency: string
}

export class OrderShipmentDto {
  id: number
  trackingNumber: string
  carrier: string
  status: string
  estimatedDelivery: Date | null
}

export class OrderInvoiceDto {
  id: number
  reference: string
  url: string
  issuedAt: Date
}

export class OrderTotalsDto {
  amount: number
  currency: string
}

export class OrderDetailResponseDto {
  id: number
  referenceId: string
  status: OrderStatus
  createdAt: Date
  payment: OrderPaymentDto | null
  lineItems: OrderLineItemDto[]
  shipments: OrderShipmentDto[]
  invoices: OrderInvoiceDto[]
  totals: OrderTotalsDto
  cancellable: boolean
  cancelReason?: string
}
