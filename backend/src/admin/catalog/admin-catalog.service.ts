import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, PrismaClientKnownRequestError } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { UpdateProductInventoryDto } from './dto/update-product-inventory.dto'
import { CreateProductImageDto } from './dto/create-product-image.dto'

@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.ensureCategoryExists(dto.parentId)
    }

    await this.ensureCategorySlugAvailable(dto.slug)

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId: dto.parentId ?? null,
      },
    })
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    if (dto.parentId) {
      await this.ensureCategoryExists(dto.parentId)
    }

    if (dto.slug) {
      await this.ensureCategorySlugAvailable(dto.slug, id)
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId: dto.parentId ?? undefined,
      },
    })
  }

  async deleteCategory(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } },
        productCategory: { select: { id: true } },
        productSubcategory: { select: { id: true } },
      },
    })

    if (!category) {
      throw new NotFoundException('Category not found')
    }

    if (category.children.length) {
      throw new BadRequestException('Cannot delete a category that has child categories. Reparent or remove children first.')
    }

    if (category.productCategory.length || category.productSubcategory.length) {
      throw new BadRequestException('Cannot delete a category that is assigned to products.')
    }

    await this.prisma.category.delete({ where: { id } })

    return { success: true }
  }

  async createProduct(dto: CreateProductDto) {
    await this.ensureProductSlugAvailable(dto.slug)

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId)
    }

    if (dto.subcategoryId) {
      await this.ensureCategoryExists(dto.subcategoryId)
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        brand: dto.brand,
        price: dto.price,
        currency: dto.currency,
        listPrice: dto.listPrice,
        salePrice: dto.salePrice,
        saleStartsAt: dto.saleStartsAt ? new Date(dto.saleStartsAt) : null,
        saleEndsAt: dto.saleEndsAt ? new Date(dto.saleEndsAt) : null,
        categoryId: dto.categoryId ?? null,
        subcategoryId: dto.subcategoryId ?? null,
        stockQuantity: dto.stockQuantity ?? 0,
        availableQuantity: dto.availableQuantity ?? dto.stockQuantity ?? 0,
        reservedQuantity: dto.reservedQuantity ?? 0,
        inventoryStatus: dto.inventoryStatus,
        isAvailable: dto.isAvailable ?? true,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId)
    }

    if (dto.subcategoryId) {
      await this.ensureCategoryExists(dto.subcategoryId)
    }

    if (dto.slug) {
      await this.ensureProductSlugAvailable(dto.slug, id)
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        brand: dto.brand,
        price: dto.price,
        currency: dto.currency,
        listPrice: dto.listPrice,
        salePrice: dto.salePrice,
        saleStartsAt: dto.saleStartsAt ? new Date(dto.saleStartsAt) : undefined,
        saleEndsAt: dto.saleEndsAt ? new Date(dto.saleEndsAt) : undefined,
        categoryId: dto.categoryId ?? undefined,
        subcategoryId: dto.subcategoryId ?? undefined,
        isAvailable: dto.isAvailable,
        isActive: dto.isActive,
      },
    })
  }

  async updateInventory(id: number, dto: UpdateProductInventoryDto) {
    await this.ensureProductExists(id)

    return this.prisma.product.update({
      where: { id },
      data: {
        stockQuantity: dto.stockQuantity,
        availableQuantity: dto.availableQuantity,
        reservedQuantity: dto.reservedQuantity,
        inventoryStatus: dto.inventoryStatus,
        isAvailable: dto.isAvailable,
        isActive: dto.isActive,
      },
    })
  }

  async softDeleteProduct(id: number) {
    await this.ensureProductExists(id)

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        isAvailable: false,
        stockQuantity: 0,
        availableQuantity: 0,
        reservedQuantity: 0,
        inventoryStatus: 'DELETED',
      },
    })
  }

  async addProductImage(productId: number, dto: CreateProductImageDto) {
    await this.ensureProductExists(productId)

    const operations: Prisma.PrismaPromise<unknown>[] = []

    if (dto.isPrimary) {
      operations.push(
        this.prisma.productImage.updateMany({
          where: { productId, isPrimary: true },
          data: { isPrimary: false },
        }),
      )
    }

    operations.push(
      this.prisma.productImage.create({
        data: {
          productId,
          url: dto.url,
          altText: dto.altText,
          focalPoint: dto.focalPoint ? { x: dto.focalPoint.x, y: dto.focalPoint.y } : null,
          provider: dto.provider,
          sortOrder: dto.sortOrder ?? 0,
          isPrimary: dto.isPrimary ?? false,
          metadata: dto.metadata,
        },
      }),
    )

    const results = await this.prisma.$transaction(operations)

    return results[results.length - 1]
  }

  async removeProductImage(productId: number, imageId: number) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } })

    if (!image) {
      throw new NotFoundException('Image not found')
    }

    if (image.productId !== productId) {
      throw new BadRequestException('Image does not belong to the requested product.')
    }

    return this.prisma.productImage.delete({ where: { id: imageId } })
  }

  private async ensureCategoryExists(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } })
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found.`)
    }
    return category
  }

  private async ensureProductExists(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } })
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found.`)
    }
    return product
  }

  private async ensureCategorySlugAvailable(slug: string, excludeId?: number) {
    const conflict = await this.prisma.category.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })

    if (conflict) {
      throw new ConflictException(`Category slug "${slug}" is already in use.`)
    }
  }

  private async ensureProductSlugAvailable(slug: string, excludeId?: number) {
    const conflict = await this.prisma.product.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    })

    if (conflict) {
      throw new ConflictException(`Product slug "${slug}" is already in use.`)
    }
  }
}
