import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { CartItemStatus, Product } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export type CartTotals = {
  currency: string
  subtotal: number
  tax: number
  total: number
}

export type CartItemView = {
  id: number
  productId: number
  name: string
  quantity: number
  price: number
  currency: string
  availability: {
    isAvailable: boolean
    inventoryStatus: Product['inventoryStatus'] | null
    availableQuantity: number
  }
}

export type CartMutationResult = {
  items: CartItemView[]
  totals: CartTotals
}

@Injectable()
export class CartService {
  private readonly taxRate = 0.08

  constructor(private readonly prisma: PrismaService) {}

  async updateCartItemQuantity(userId: number, itemId: number, quantity: number): Promise<CartMutationResult> {
    const cartItem = await this.fetchCartItemForUser(itemId, userId)

    this.ensureItemActive(cartItem)
    this.ensureProductPurchasable(cartItem.product)

    const availableQuantity = Math.max(0, cartItem.product.availableQuantity ?? 0)
    if (availableQuantity <= 0) {
      throw new BadRequestException('This item is no longer available for purchase.')
    }

    if (quantity > availableQuantity) {
      throw new BadRequestException(
        `Requested quantity exceeds available stock. Only ${availableQuantity} ${
          availableQuantity === 1 ? 'unit' : 'units'
        } remain.`,
      )
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    })

    return this.buildCartResponse(cartItem.cartId)
  }

  async removeCartItem(userId: number, itemId: number): Promise<CartMutationResult> {
    const cartItem = await this.fetchCartItemForUser(itemId, userId)

    this.ensureItemActive(cartItem)

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        status: CartItemStatus.REMOVED,
        removedAt: new Date(),
      },
    })

    return this.buildCartResponse(cartItem.cartId)
  }

  async getCartForUser(userId: number): Promise<CartMutationResult> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } })
    if (!cart) {
      return {
        items: [],
        totals: {
          currency: 'USD',
          subtotal: 0,
          tax: 0,
          total: 0,
        },
      }
    }

    return this.buildCartResponse(cart.id)
  }

  private async fetchCartItemForUser(itemId: number, userId: number) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, product: true },
    })

    if (!cartItem || !cartItem.cart || cartItem.cart.userId !== userId) {
      throw new NotFoundException('Cart item not found')
    }

    if (!cartItem.product) {
      throw new NotFoundException('Product for cart item is missing')
    }

    return cartItem
  }

  private ensureItemActive(cartItem: { status: CartItemStatus }) {
    if (cartItem.status !== CartItemStatus.ACTIVE) {
      throw new BadRequestException('This cart item has already been removed')
    }
  }

  private ensureProductPurchasable(product: Product) {
    if (!product.isActive || !product.isAvailable || product.inventoryStatus === 'DISCONTINUED') {
      throw new BadRequestException('This item is no longer available for purchase.')
    }
  }

  private async buildCartResponse(cartId: number): Promise<CartMutationResult> {
    const rawItems = await this.prisma.cartItem.findMany({
      where: { cartId, status: CartItemStatus.ACTIVE },
      include: { product: true },
      orderBy: { updatedAt: 'desc' },
    })

    const itemsWithProduct = rawItems.filter(
      (item): item is (typeof item & { product: Product }) => Boolean(item.product),
    )

    const items: CartItemView[] = itemsWithProduct.map((item) => {
      const product = item.product
      const availableQuantity = Math.max(0, product.availableQuantity ?? 0)
      return {
        id: item.id,
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        price: Number(product.price ?? 0),
        currency: product.currency ?? 'USD',
        availability: {
          isAvailable: Boolean(product.isAvailable),
          inventoryStatus: product.inventoryStatus,
          availableQuantity,
        },
      }
    })

    const totals = this.calculateTotals(items)
    return { items, totals }
  }

  private calculateTotals(items: CartItemView[]): CartTotals {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const tax = subtotal * this.taxRate
    const total = subtotal + tax
    return {
      currency: items[0]?.currency ?? 'USD',
      subtotal: this.round(subtotal),
      tax: this.round(tax),
      total: this.round(total),
    }
  }

  private round(value: number) {
    return Number(value.toFixed(2))
  }
}
