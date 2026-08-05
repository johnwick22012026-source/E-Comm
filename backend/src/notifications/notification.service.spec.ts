import { InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NotificationService, OrderBaseEmailContext, ShipmentEmailContext, DeliveryEmailContext, RefundEmailContext, OrderEmailItem } from './notification.service'

describe('NotificationService', () => {
  const configService = {
    get: (key: string) => {
      switch (key) {
        case 'BRAND_NAME':
          return 'Atlas Shop'
        case 'FRONTEND_URL':
          return 'https://shop.example.com'
        case 'SUPPORT_EMAIL':
          return 'help@shop.example.com'
        default:
          return undefined
      }
    },
  } as unknown as ConfigService

  let mockProvider: { send: jest.Mock }
  let service: NotificationService

  beforeEach(() => {
    mockProvider = { send: jest.fn().mockResolvedValue(undefined) }
    service = new NotificationService(mockProvider as any, configService)
  })

  it('sends verification email with branded copy and link', async () => {
    await service.sendVerificationEmail('alice@example.com', 'abc123', { name: 'Alice' })

    expect(mockProvider.send).toHaveBeenCalledTimes(1)
    const sent = mockProvider.send.mock.calls[0][0]
    expect(sent.to).toBe('alice@example.com')
    expect(sent.subject).toContain('Verify your Atlas Shop account')
    expect(sent.html).toContain('Alice')
    expect(sent.text).toContain('Verify my email')
    expect(sent.text).toContain('https://shop.example.com/auth/verify-email?token=abc123')
  })

  it('sends password reset email with link details', async () => {
    await service.sendPasswordResetEmail('user@example.com', 'reset-token', { name: 'Jordan' })

    const sent = mockProvider.send.mock.calls[0][0]
    expect(sent.subject).toContain('Reset your Atlas Shop password')
    expect(sent.text).toContain('https://shop.example.com/auth/reset-password?token=reset-token')
    expect(sent.html).toContain('Reset my password')
  })

  const sampleItems: OrderEmailItem[] = [
    { name: 'Seagrass Tote', quantity: 1, price: '$85.00' },
    { name: 'Handcrafted Bowl', quantity: 2, price: '$60.00' },
  ]

  const baseContext: OrderBaseEmailContext = {
    email: 'order@example.com',
    customerName: 'Riley',
    orderNumber: 'ORD-1001',
    orderDate: '2024-09-20',
    items: sampleItems,
    subtotal: '$205.00',
    shippingCost: '$15.00',
    total: '$220.00',
  }

  it('sends order confirmation email with order summary', async () => {
    await service.sendOrderConfirmationEmail(baseContext)
    const sent = mockProvider.send.mock.calls[0][0]
    expect(sent.subject).toContain('We received your Atlas Shop order #ORD-1001')
    expect(sent.html).toContain('Seagrass Tote')
    expect(sent.text).toContain('Total: $220.00')
    expect(sent.text).toContain('View order details: https://shop.example.com/account/orders/ORD-1001')
  })

  it('sends shipment confirmation email with tracking info', async () => {
    const shipmentContext: ShipmentEmailContext = {
      ...baseContext,
      trackingNumber: 'TRACK-555',
      trackingUrl: 'https://shipper.example.com/track/TRACK-555',
      shippingMethod: 'Express',
    }

    await service.sendShipmentConfirmationEmail(shipmentContext)
    const sent = mockProvider.send.mock.calls[0][0]
    expect(sent.subject).toContain('Your Atlas Shop order #ORD-1001 is on the way')
    expect(sent.html).toContain('Tracking #')
    expect(sent.html).toContain('TRACK-555')
    expect(sent.text).toContain('Track: https://shipper.example.com/track/TRACK-555')
  })

  it('sends delivery confirmation email with delivery date', async () => {
    const deliveredContext: DeliveryEmailContext = {
      ...baseContext,
      deliveryDate: 'September 23, 2024',
    }

    await service.sendDeliveryConfirmationEmail(deliveredContext)
    const sent = mockProvider.send.mock.calls[0][0]
    expect(sent.subject).toContain('Delivered: Atlas Shop order #ORD-1001')
    expect(sent.text).toContain('Delivered: September 23, 2024')
  })

  it('sends refund confirmation email with reason and amount', async () => {
    const refundContext: RefundEmailContext = {
      ...baseContext,
      refundAmount: '$220.00',
      refundReason: 'Order canceled by customer',
    }

    await service.sendRefundConfirmationEmail(refundContext)
    const sent = mockProvider.send.mock.calls[0][0]
    expect(sent.subject).toContain('Refund issued for order #ORD-1001')
    expect(sent.text).toContain('We processed a refund of $220.00')
    expect(sent.text).toContain('Order canceled by customer')
  })

  it('surface errors when provider fails to send', async () => {
    mockProvider.send.mockRejectedValueOnce(new Error('SMTP failure'))
    await expect(service.sendVerificationEmail('broken@example.com', 'token')).rejects.toThrow(
      InternalServerErrorException,
    )
  })
})
