import { BadRequestException } from '@nestjs/common'
import { CartItemStatus } from '@prisma/client'
import { CartMutationResult } from './cart.service'
import { CartService } from './cart.service'

describe('CartService', () => {
  let service: CartService
  let prismaMock: any

  beforeEach(() => {
    prismaMock = {
      cartItem: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    }
    service = new CartService(prismaMock as any)
  })

  it('updates cart item quantity and recalculates totals when inventory allows', async () => {
    const cartItem = {
      id: 1,
      cartId: 10,
      status: CartItemStatus.ACTIVE,
      quantity: 1,
      cart: { id: 10, userId: 42 },
      product: {
        id: 100,
        name: 'Test product',
        price: 20,
        currency: 'USD',
        availableQuantity: 5,
        isAvailable: true,
        isActive: true,
        inventoryStatus: 'IN_STOCK',
      },
    }

    prismaMock.cartItem.findUnique.mockResolvedValue(cartItem)
    prismaMock.cartItem.update.mockResolvedValue({ ...cartItem, quantity: 3 })
    prismaMock.cartItem.findMany.mockResolvedValue([
      {
        id: 1,
        quantity: 3,
        product: cartItem.product,
      },
    ])

    const result = await service.updateCartItemQuantity(42, 1, 3)

    expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { quantity: 3 },
    })
    expect(result.totals).toEqual({ currency: 'USD', subtotal: 60, tax: 4.8, total: 64.8 })
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 1,
        quantity: 3,
        price: 20,
        availability: expect.objectContaining({ availableQuantity: 5 }),
      }),
    ])
  })

  it('throws when requested quantity exceeds available inventory', async () => {
    const cartItem = {
      id: 2,
      cartId: 11,
      status: CartItemStatus.ACTIVE,
      quantity: 1,
      cart: { id: 11, userId: 99 },
      product: {
        id: 101,
        name: 'Sold out product',
        price: 30,
        currency: 'USD',
        availableQuantity: 2,
        isAvailable: true,
        isActive: true,
        inventoryStatus: 'IN_STOCK',
      },
    }

    prismaMock.cartItem.findUnique.mockResolvedValue(cartItem)

    await expect(service.updateCartItemQuantity(99, 2, 4)).rejects.toThrow(BadRequestException)
  })

  it('throws when updating an item belonging to another user', async () => {
    const cartItem = {
      id: 5,
      cartId: 15,
      status: CartItemStatus.ACTIVE,
      quantity: 2,
      cart: { id: 15, userId: 30 },
      product: {
        id: 103,
        name: 'Shared product',
        price: 15,
        currency: 'USD',
        availableQuantity: 10,
        isAvailable: true,
        isActive: true,
        inventoryStatus: 'IN_STOCK',
      },
    }

    prismaMock.cartItem.findUnique.mockResolvedValue(cartItem)

    await expect(service.updateCartItemQuantity(31, 5, 3)).rejects.toThrow(BadRequestException)
  })

  it('removing the last item returns zeroed totals and no items', async () => {
    const cartItem = {
      id: 3,
      cartId: 12,
      status: CartItemStatus.ACTIVE,
      quantity: 1,
      cart: { id: 12, userId: 18 },
      product: {
        id: 102,
        name: 'Good product',
        price: 10,
        currency: 'USD',
        availableQuantity: 3,
        isAvailable: true,
        isActive: true,
        inventoryStatus: 'IN_STOCK',
      },
    }

    prismaMock.cartItem.findUnique.mockResolvedValue(cartItem)
    prismaMock.cartItem.update.mockResolvedValue({ ...cartItem, status: CartItemStatus.REMOVED })
    prismaMock.cartItem.findMany.mockResolvedValue([])

    const result: CartMutationResult = await service.removeCartItem(18, 3)

    expect(prismaMock.cartItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        data: expect.objectContaining({ status: CartItemStatus.REMOVED }),
      }),
    )
    expect(result.items).toHaveLength(0)
    expect(result.totals).toEqual({ currency: 'USD', subtotal: 0, tax: 0, total: 0 })
  })
})
