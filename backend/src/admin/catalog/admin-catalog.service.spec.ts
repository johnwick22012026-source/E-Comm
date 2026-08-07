import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AdminCatalogService } from './admin-catalog.service'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { UpdateProductInventoryDto } from './dto/update-product-inventory.dto'

describe('AdminCatalogService', () => {
  let service: AdminCatalogService
  let prisma: jest.Mocked<PrismaService>

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn().mockResolvedValue([]),
      category: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue({} as any),
        update: jest.fn().mockResolvedValue({ id: 1 }),
      } as unknown as Prisma.CategoryDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>,
      product: {
        findUnique: jest.fn().mockResolvedValue({ id: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id: 1 }),
      } as unknown as Prisma.ProductDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>,
      productImage: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 } as any),
        create: jest.fn().mockResolvedValue({} as any),
        findUnique: jest.fn().mockResolvedValue(null),
      } as unknown as Prisma.ProductImageDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>,
    } as unknown as jest.Mocked<PrismaService>

    service = new AdminCatalogService(prisma)
  })

  describe('updateInventory', () => {
    const inventoryDto = (overrides: Partial<UpdateProductInventoryDto>) => ({
      stockQuantity: overrides.stockQuantity,
      availableQuantity: overrides.availableQuantity,
      reservedQuantity: overrides.reservedQuantity,
      inventoryStatus: overrides.inventoryStatus,
      isAvailable: overrides.isAvailable,
      isActive: overrides.isActive,
    } as UpdateProductInventoryDto)

    it('throws when stock quantity is negative', async () => {
      await expect(service.updateInventory(1, inventoryDto({ stockQuantity: -1 }))).rejects.toBeInstanceOf(
        BadRequestException,
      )
    })

    it('throws when available exceeds stock', async () => {
      await expect(
        service.updateInventory(1, inventoryDto({ stockQuantity: 5, availableQuantity: 6 })),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('throws when reserved exceeds stock', async () => {
      await expect(
        service.updateInventory(1, inventoryDto({ stockQuantity: 5, reservedQuantity: 6 })),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('forces availability to false when marking inactive even if not provided', async () => {
      await service.updateInventory(1, inventoryDto({ stockQuantity: 10, isActive: false }))

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            isActive: false,
            isAvailable: false,
            updatedAt: expect.any(Date),
          }),
        }),
      )
    })
  })

  describe('deleteCategory', () => {
    it('throws when category is assigned to products', async () => {
      ;(prisma.category.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        children: [],
        productCategory: [{ id: 1 }],
        productSubcategory: [],
      })

      await expect(service.deleteCategory(1)).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.category.delete).not.toHaveBeenCalled()
    })
  })

  describe('updateCategory', () => {
    it('throws when category is not found', async () => {
      ;(prisma.category.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(service.updateCategory(1, { name: 'Reparent' } as UpdateCategoryDto)).rejects.toBeInstanceOf(
        NotFoundException,
      )

      expect(prisma.category.update).not.toHaveBeenCalled()
    })
  })

  describe('updateProduct', () => {
    it('throws when product is not found', async () => {
      ;(prisma.product.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(service.updateProduct(1, {} as UpdateProductDto)).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.product.update).not.toHaveBeenCalled()
    })
  })
})
