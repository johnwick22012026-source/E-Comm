import { BadRequestException, Injectable } from '@nestjs/common'
import { CartItemStatus, CouponDiscountType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CartPricingRequestDto, ShippingDestinationDto } from './dto/cart-pricing-request.dto'

export type CartPricingItem = {
  productId: number
  name: string
  sku?: string | null
  requestedQuantity: number
  quantityConsidered: number
  unitPrice: number
  currency: string
  lineSubtotal: number
  adjustedForAvailability: boolean
  availability: {
    isAvailable: boolean
    inventoryStatus: string | null
    availableQuantity: number
  }
}

export type ShippingEstimate = {
  cost: number
  currency: string
  provider: string
  serviceLevel: string
  estimatedDeliveryDays: number
  destination: ShippingDestinationDto
}

export type CartPricingResponse = {
  items: CartPricingItem[]
  subtotal: number
  currency: string
  discountTotal: number
  totalAfterDiscount: number
  shippingEstimate: ShippingEstimate
  estimatedTotal: number
  coupon?: {
    code: string
    description?: string | null
    discountType: CouponDiscountType
    discountValue: number
  }
}

@Injectable()
export class CartPricingService {
  private readonly currencyFallback = 'USD'
  private readonly primaryDomesticCountry = 'US'
  private readonly domesticBaseCost = 6
  private readonly domesticPerItem = 1.5
  private readonly internationalBaseCost = 12
  private readonly internationalPerItem = 3

  constructor(private readonly prisma: PrismaService) {}

  async estimatePricing(userId: number, payload: CartPricingRequestDto): Promise<CartPricingResponse> {
    const now = new Date()
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    })

    if (!cart) {
      return this.buildEmptyResponse(payload.shippingDestination)
    }

    const rawItems = await this.prisma.cartItem.findMany({
      where: {
        cartId: cart.id,
        status: CartItemStatus.ACTIVE,
      },
      include: { product: true },
      orderBy: { updatedAt: 'desc' },
    })

    const productIds = rawItems.map((item) => item.productId)

    const reservations = productIds.length
      ? await this.prisma.cartInventoryReservation.findMany({
          where: {
            productId: { in: productIds },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: {
            productId: true,
            reservedQuantity: true,
          },
        })
      : []

    const reservedMap: Record<number, number> = {}
    reservations.forEach((reservation) => {
      const current = reservedMap[reservation.productId] ?? 0
      reservedMap[reservation.productId] = current + (reservation.reservedQuantity ?? 0)
    })

    const lineItems: CartPricingItem[] = rawItems
      .filter((item) => Boolean(item.product) && Number.isFinite(Number(item.product?.price)))
      .map((item) => {
        const product = item.product!
        const requestedQuantity = item.quantity
        const availableSnapshot = Math.max(0, product.availableQuantity ?? 0)
        const reserved = Math.max(0, reservedMap[product.id] ?? 0)
        const availableAfterReservations = Math.max(0, availableSnapshot - reserved)
        const quantityConsidered = Math.min(requestedQuantity, availableAfterReservations)
        const unitPrice = Number(product.price ?? 0)
        const lineSubtotal = this.round(unitPrice * quantityConsidered)
        const adjusted = quantityConsidered !== requestedQuantity
        return {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          requestedQuantity,
          quantityConsidered,
          unitPrice,
          currency: product.currency ?? this.currencyFallback,
          lineSubtotal,
          adjustedForAvailability: adjusted,
          availability: {
            isAvailable: Boolean(product.isAvailable && availableAfterReservations > 0),
            inventoryStatus: product.inventoryStatus,
            availableQuantity: availableAfterReservations,
          },
        }
      })

    const currency = lineItems[0]?.currency ?? this.currencyFallback
    const subtotal = this.round(lineItems.reduce((sum, item) => sum + item.lineSubtotal, 0))

    const couponData = await this.resolveCoupon(payload.couponCode, subtotal, now)
    const discountTotal = couponData.discount
    const totalAfterDiscount = this.round(subtotal - discountTotal)

    const shippingEstimate = this.calculateShipping(lineItems, payload.shippingDestination)
    const estimatedTotal = this.round(totalAfterDiscount + shippingEstimate.cost)

    return {
      items: lineItems,
      subtotal,
      currency,
      discountTotal,
      totalAfterDiscount,
      shippingEstimate,
      estimatedTotal,
      coupon: couponData.coupon,
    }
  }

  private async resolveCoupon(
    couponCode: string | undefined,
    subtotal: number,
    now: Date,
  ): Promise<{ coupon?: { code: string; description?: string | null; discountType: CouponDiscountType; discountValue: number }; discount: number }> {
    if (!couponCode) {
      return { discount: 0 }
    }

    const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode.trim() } })
    if (!coupon) {
      throw new BadRequestException('Coupon code is invalid')
    }

    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException('Coupon is not yet active')
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException('Coupon has expired')
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached')
    }

    const discountValue = Number(coupon.discountValue ?? 0)
    let discount = 0

    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      discount = subtotal * (discountValue / 100)
    } else {
      discount = discountValue
    }

    const roundedDiscount = this.round(Math.min(discount, subtotal))

    return {
      coupon: {
        code: coupon.code,
        description: coupon.description ?? null,
        discountType: coupon.discountType,
        discountValue,
      },
      discount: roundedDiscount,
    }
  }

  private calculateShipping(lineItems: CartPricingItem[], destination: ShippingDestinationDto): ShippingEstimate {
    const count = lineItems.reduce((sum, item) => sum + item.quantityConsidered, 0)

    const normalizedCountry = destination.country.trim().toUpperCase()
    const isDomestic = normalizedCountry === this.primaryDomesticCountry

    const baseCost = isDomestic ? this.domesticBaseCost : this.internationalBaseCost
    const perItem = isDomestic ? this.domesticPerItem : this.internationalPerItem

    const cost = count > 0 ? this.round(baseCost + perItem * count) : 0
    const serviceLevel = isDomestic ? 'Domestic Standard' : 'International Economy'
    const estimatedDeliveryDays = isDomestic ? 4 : 12

    return {
      cost,
      currency: this.currencyFallback,
      provider: 'Commerce Logistics',
      serviceLevel,
      estimatedDeliveryDays,
      destination,
    }
  }

  private buildEmptyResponse(destination: ShippingDestinationDto): CartPricingResponse {
    const shippingEstimate = this.calculateShipping([], destination)
    return {
      items: [],
      subtotal: 0,
      currency: this.currencyFallback,
      discountTotal: 0,
      totalAfterDiscount: 0,
      shippingEstimate,
      estimatedTotal: shippingEstimate.cost,
    }
  }

  private round(value: number) {
    return Number(value.toFixed(2))
  }
}
