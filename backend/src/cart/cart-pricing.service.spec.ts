import { BadRequestException } from '@nestjs/common'
import { CartItemStatus, CouponDiscountType } from '@prisma/client'
import { CartPricingRequestDto } from './dto/cart-pricing-request.dto'
import { CartPricingService } from './cart-pricing.service'

describe('CartPricingService', () => {
  let service: CartPricingService
  let prismaMock: any
  const now = new Date('2025-01-01T00:00:00Z')

  beforeEach(() => {
    prismaMock = {
      cart: { findUnique: jest.fn() },
      cartItem: { findMany: jest.fn() },
      cartInventoryReservation: { findMany: jest.fn() },
      coupon: { findUnique: jest.fn() },
    }

    jest.spyOn(Date, 'now').mockReturnValue(now.getTime())

    service = new CartPricingService(prismaMock)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns subtotal, discount, shipping, and estimated total', async () => {
    prismaMock.cart.findUnique.mockResolvedValue({ id: 9 })
    prismaMock.cartItem.findMany.mockResolvedValue([
      {
        id: 1,
        cartId: 9,
        quantity: 2,
        productId: 100,
        product: {
          id: 100,
          name: 'Widget',
          sku: 'W-1',
          price: 25,
          currency: 'USD',
          availableQuantity: 5,
          reservedQuantity: 0,
          isAvailable: true,
          isActive: true,
          inventoryStatus: 'IN_STOCK',
        },
      },
    ])
    prismaMock.cartInventoryReservation.findMany.mockResolvedValue([
      {
        productId: 100,
        reservedQuantity: 1,
      },
    ])
    prismaMock.coupon.findUnique.mockResolvedValue({
      code: 'TENOFF',
      discountType: CouponDiscountType.PERCENTAGE,
      discountValue: 10,
      description: '10% off',
      usageCount: 0,
      usageLimit: 100,
      startsAt: new Date('2024-01-01T00:00:00Z'),
      expiresAt: new Date('2026-01-01T00:00:00Z'),
    })

    const payload: CartPricingRequestDto = {
      couponCode: 'TENOFF',
      shippingDestination: { country: 'US' },
    }

    const response = await service.estimatePricing(42, payload)

    expect(response.subtotal).toBe(25)
    expect(response.discountTotal).toBe(2.5)
    expect(response.totalAfterDiscount).toBe(22.5)
    expect(response.shippingEstimate.cost).toBe(7.5)
    expect(response.estimatedTotal).toBe(30)
    expect(response.coupon).toMatchObject({ code: 'TENOFF', discountType: CouponDiscountType.PERCENTAGE })
    expect(response.items[0]).toMatchObject({ quantityConsidered: 1, requestedQuantity: 2 })
  })

  it('throws when coupon is expired', async () => {
    prismaMock.cart.findUnique.mockResolvedValue({ id: 3 })
    prismaMock.cartItem.findMany.mockResolvedValue([])
    prismaMock.cartInventoryReservation.findMany.mockResolvedValue([])
    prismaMock.coupon.findUnique.mockResolvedValue({
      code: 'EXPIRED',
      discountType: CouponDiscountType.FIXED,
      discountValue: 5,
      description: null,
      usageCount: 0,
      startsAt: new Date('2020-01-01T00:00:00Z'),
      expiresAt: new Date('2022-01-01T00:00:00Z'),
    })

    await expect(
      service.estimatePricing(13, {
        couponCode: 'EXPIRED',
        shippingDestination: { country: 'CA' },
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('returns zeroed lines when inventory fully reserved', async () => {
    prismaMock.cart.findUnique.mockResolvedValue({ id: 7 })
    prismaMock.cartItem.findMany.mockResolvedValue([
      {
        id: 5,
        cartId: 7,
        quantity: 3,
        productId: 200,
        product: {
          id: 200,
          name: 'Gadget',
          sku: 'G-1',
          price: 40,
          currency: 'USD',
          availableQuantity: 10,
          reservedQuantity: 0,
          isAvailable: true,
          isActive: true,
          inventoryStatus: 'IN_STOCK',
        },
      },
    ])
    prismaMock.cartInventoryReservation.findMany.mockResolvedValue([
      {
        productId: 200,
        reservedQuantity: 10,
      },
    ])
    prismaMock.coupon.findUnique.mockResolvedValue(null)

    const response = await service.estimatePricing(50, {
      shippingDestination: { country: 'GB' },
    })

    expect(response.subtotal).toBe(0)
    expect(response.items[0].quantityConsidered).toBe(0)
    expect(response.shippingEstimate.cost).toBe(12)
    expect(response.estimatedTotal).toBe(12)
  })
})
